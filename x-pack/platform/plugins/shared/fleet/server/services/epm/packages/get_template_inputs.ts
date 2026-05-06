/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { merge } from 'lodash';
import yaml, { type Pair } from 'yaml';

import {
  getNormalizedInputs,
  isIntegrationPolicyTemplate,
  createYamlKeysSorter,
} from '../../../../common/services';

import {
  getStreamsForInputType,
  getInputEffectiveName,
  packageToPackagePolicy,
} from '../../../../common/services/package_to_package_policy';
import { _compilePackagePolicyInputs } from '../../package_policy';
import { appContextService } from '../../app_context';
import type {
  PackageInfo,
  NewPackagePolicy,
  PackagePolicyInput,
  TemplateAgentPolicyInput,
  RegistryVarsEntry,
  RegistryStream,
  PackagePolicyConfigRecordEntry,
  RegistryInput,
} from '../../../../common/types';
import { generateOtelcolConfig } from '../../agent_policies/otel_collector';
import { OTEL_COLLECTOR_INPUT_TYPE } from '../../../../common/constants';
import { getInputsWithIds } from '../../package_policies/get_input_with_ids';

import { getFullInputStreams } from '../../agent_policies/package_policies_to_agent_inputs';

import { getPackageInfo } from '.';
import { getAgentTemplateAssetsMap } from './get';

type Format = 'yml' | 'json';

const POLICY_KEYS_ORDER = [
  'id',
  'name',
  'revision',
  'dataset',
  'type',
  'outputs',
  'fleet',
  'output_permissions',
  'agent',
  'inputs',
  'enabled',
  'use_output',
  'meta',
  'input',
  'download',
  'signed',
];

const _sortYamlKeys = createYamlKeysSorter(POLICY_KEYS_ORDER, yaml);

type PackageWithInputAndStreamIndexed = Record<
  string,
  RegistryInput & {
    streams: Record<
      string,
      RegistryStream & {
        data_stream: { type?: string; dataset: string };
      }
    >;
  }
>;

// Function based off storedPackagePolicyToAgentInputs, it only creates the `streams` section instead of the FullAgentPolicyInput
export const templatePackagePolicyToFullInputStreams = (
  packagePolicyInputs: PackagePolicyInput[],
  inputAndStreamsIdsMap?: Map<string, { originalId: string; streams: Map<string, string> }>
): TemplateAgentPolicyInput[] => {
  const fullInputsStreams: TemplateAgentPolicyInput[] = [];

  if (!packagePolicyInputs || packagePolicyInputs.length === 0) return fullInputsStreams;

  packagePolicyInputs.forEach((input) => {
    const streamsIdsMap = new Map();

    const inputEffectiveName = getInputEffectiveName(input);
    const inputId = input.policy_template
      ? `${input.policy_template}-${inputEffectiveName}`
      : inputEffectiveName;
    const fullInputStream = {
      // @ts-ignore-next-line the following id is actually one level above the one in fullInputStream, but the linter thinks it gets overwritten
      id: inputId,
      type: input.type,
      ...getFullInputStreams(input, true, streamsIdsMap),
    };

    inputAndStreamsIdsMap?.set(fullInputStream.id, {
      originalId: inputId,
      streams: streamsIdsMap,
    });

    // deeply merge the input.config values with the full policy input stream
    merge(
      fullInputStream,
      Object.entries(input.config || {}).reduce((acc, [key, { value }]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>)
    );
    fullInputsStreams.push(fullInputStream);
  });

  return fullInputsStreams;
};

export async function getTemplateInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  format: 'yml',
  isInputIncluded?: (input: TemplateAgentPolicyInput) => boolean,
  prerelease?: boolean,
  ignoreUnverified?: boolean,
  injectWiredStreamsRouting?: boolean
): Promise<string>;
export async function getTemplateInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  format: 'json',
  isInputIncluded?: (input: TemplateAgentPolicyInput) => boolean,
  prerelease?: boolean,
  ignoreUnverified?: boolean,
  injectWiredStreamsRouting?: boolean
): Promise<{ inputs: TemplateAgentPolicyInput[] }>;
export async function getTemplateInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  format: Format,
  isInputIncluded: (input: TemplateAgentPolicyInput) => boolean = () => true,
  prerelease?: boolean,
  ignoreUnverified?: boolean,
  injectWiredStreamsRouting: boolean = false
) {
  const experimentalFeature = appContextService.getExperimentalFeatures();

  const packageInfo = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName,
    pkgVersion,
    prerelease,
    ignoreUnverified,
  });

  const emptyPackagePolicy = packageToPackagePolicy(packageInfo, '');

  const inputsWithStreamIds = getInputsWithIds(emptyPackagePolicy, undefined, true, packageInfo);

  const indexedInputsAndStreams = buildIndexedPackage(packageInfo);

  if (format === 'yml') {
    // Add a placeholder <VAR_NAME> to all variables without default value
    for (const inputWithStreamIds of inputsWithStreamIds) {
      const inputEffectiveName = getInputEffectiveName(inputWithStreamIds);
      const inputId = inputWithStreamIds.policy_template
        ? `${inputWithStreamIds.policy_template}-${inputEffectiveName}`
        : inputEffectiveName;

      const packageInput = indexedInputsAndStreams[inputId];
      if (!packageInput) {
        continue;
      }

      for (const [inputVarKey, inputVarValue] of Object.entries(inputWithStreamIds.vars ?? {})) {
        const varDef = packageInput.vars?.find((_varDef) => _varDef.name === inputVarKey);
        if (varDef) {
          addPlaceholderIfNeeded(varDef, inputVarValue);
        }
      }
      for (const stream of inputWithStreamIds.streams) {
        const packageStream = packageInput.streams[stream.id];
        if (!packageStream) {
          continue;
        }
        for (const [streamVarKey, streamVarValue] of Object.entries(stream.vars ?? {})) {
          const varDef = packageStream.vars?.find((_varDef) => _varDef.name === streamVarKey);
          if (varDef) {
            addPlaceholderIfNeeded(varDef, streamVarValue);
          }
        }
      }
    }
  }
  const logger = appContextService.getLogger();
  const assetsMap = await getAgentTemplateAssetsMap({
    logger,
    packageInfo,
    savedObjectsClient: soClient,
    ignoreUnverified,
  });

  const compiledInputs = await _compilePackagePolicyInputs(
    packageInfo,
    emptyPackagePolicy.vars || {},
    inputsWithStreamIds,
    assetsMap
  );
  const packagePolicyWithInputs: NewPackagePolicy = {
    ...emptyPackagePolicy,
    inputs: compiledInputs,
  };
  const inputIdsDestinationMap = new Map<
    string,
    { originalId: string; streams: Map<string, string> }
  >();
  const inputs = templatePackagePolicyToFullInputStreams(
    packagePolicyWithInputs.inputs as PackagePolicyInput[],
    inputIdsDestinationMap
  ).filter(isInputIncluded);

  if (injectWiredStreamsRouting) {
    for (const input of inputs) {
      const inputStreams = input.streams as Array<{
        data_stream?: { type?: string };
        processors?: Array<Record<string, unknown>>;
      }>;
      if (inputStreams) {
        for (const stream of inputStreams) {
          if (stream.data_stream?.type === 'logs') {
            stream.processors = stream.processors || [];
            stream.processors.unshift({
              add_fields: {
                target: '@metadata',
                fields: { raw_index: 'logs.ecs' },
              },
            });
          }
        }
      }
    }
  }

  let otelcolConfig;
  if (experimentalFeature.enableOtelIntegrations) {
    otelcolConfig = generateOtelcolConfig({
      inputs,
      logger,
      defaultPackageInfo: packageInfo,
    });
  }
  // filter out the otelcol inputs, they will be added at the root of the config
  const filteredInputs = inputs.filter((input) => input.type !== OTEL_COLLECTOR_INPUT_TYPE);

  if (format === 'json') {
    return { inputs: filteredInputs, ...(otelcolConfig ? otelcolConfig : {}) };
  } else if (format === 'yml') {
    const data = { inputs: filteredInputs, ...(otelcolConfig ? otelcolConfig : {}) };
    const doc = new yaml.Document(data, {
      sortMapEntries: _sortYamlKeys as (a: Pair, b: Pair) => number,
      strict: false,
    });
    const yamlStr = doc.toString({ singleQuote: true });
    return addCommentsToYaml(yamlStr, buildIndexedPackage(packageInfo), inputIdsDestinationMap);
  }

  return { inputs: [] };
}

function getPlaceholder(varDef: RegistryVarsEntry) {
  return `<${varDef.name.toUpperCase()}>`;
}

function addPlaceholderIfNeeded(
  varDef: RegistryVarsEntry,
  varValue: PackagePolicyConfigRecordEntry
) {
  const placeHolder = `<${varDef.name.toUpperCase()}>`;
  if (varDef && !varValue.value && varDef.type !== 'yaml') {
    varValue.value = placeHolder;
  } else if (varDef && varValue.value && varValue.value.length === 0 && varDef.type === 'text') {
    varValue.value = [placeHolder];
  }
}

function buildIndexedPackage(packageInfo: PackageInfo): PackageWithInputAndStreamIndexed {
  return (
    packageInfo.policy_templates?.reduce<PackageWithInputAndStreamIndexed>(
      (inputsAcc, policyTemplate) => {
        const inputs = getNormalizedInputs(policyTemplate);

        inputs.forEach((packageInput) => {
          const inputEffectiveName = getInputEffectiveName(packageInput);
          const inputId = `${policyTemplate.name}-${inputEffectiveName}`;

          const streams = getStreamsForInputType(
            inputEffectiveName,
            packageInfo,
            isIntegrationPolicyTemplate(policyTemplate) && policyTemplate.data_streams
              ? policyTemplate.data_streams
              : []
          ).reduce<
            Record<
              string,
              RegistryStream & {
                data_stream: { type?: string; dataset: string };
              }
            >
          >((acc, stream) => {
            const streamId = `${inputEffectiveName}-${stream.data_stream.dataset}`;
            acc[streamId] = {
              ...stream,
            };
            return acc;
          }, {});

          inputsAcc[inputId] = {
            ...packageInput,
            streams,
          };
        });
        return inputsAcc;
      },
      {}
    ) ?? {}
  );
}

function addCommentsToYaml(
  yamlStr: string,
  packageIndexInputAndStreams: PackageWithInputAndStreamIndexed,
  inputIdsDestinationMap: Map<string, { originalId: string; streams: Map<string, string> }>
) {
  const doc = yaml.parseDocument(yamlStr);
  // Add input and streams comments
  const yamlInputs = doc.get('inputs');
  if (yaml.isCollection(yamlInputs)) {
    yamlInputs.items.forEach((inputItem) => {
      if (!yaml.isMap(inputItem)) {
        return;
      }
      const inputIdNode = inputItem.get('id', true);
      if (!yaml.isScalar(inputIdNode)) {
        return;
      }
      const inputId =
        inputIdsDestinationMap.get(inputIdNode.value as string)?.originalId ??
        (inputIdNode.value as string);
      const pkgInput = packageIndexInputAndStreams[inputId];
      if (pkgInput) {
        inputItem.commentBefore = ` ${pkgInput.title}${
          pkgInput.description ? `: ${pkgInput.description}` : ''
        }`;

        commentVariablesInYaml(inputItem, pkgInput.vars ?? []);

        const yamlStreams = inputItem.get('streams');
        if (!yaml.isCollection(yamlStreams)) {
          return;
        }
        yamlStreams.items.forEach((streamItem) => {
          if (!yaml.isMap(streamItem)) {
            return;
          }
          const streamIdNode = streamItem.get('id', true);
          if (yaml.isScalar(streamIdNode)) {
            const streamId =
              inputIdsDestinationMap
                .get(inputIdNode.value as string)
                ?.streams?.get(streamIdNode.value as string) ?? (streamIdNode.value as string);
            const pkgStream = pkgInput.streams[streamId];
            if (pkgStream) {
              streamItem.commentBefore = ` ${pkgStream.title}${
                pkgStream.description ? `: ${pkgStream.description}` : ''
              }`;
              commentVariablesInYaml(streamItem, pkgStream.vars ?? []);
            }
          }
        });
      }
    });
  }

  return doc.toString({ singleQuote: true });
}

function commentVariablesInYaml(rootNode: yaml.Node, vars: RegistryVarsEntry[] = []) {
  // Node need to be deleted after the end of the visit to be able to visit every node
  const toDeleteFn: Array<() => void> = [];
  yaml.visit(rootNode, {
    Scalar(key, node, path) {
      if (node.value) {
        const val = node.value.toString();
        for (const varDef of vars) {
          const placeholder = getPlaceholder(varDef);
          if (val.includes(placeholder)) {
            node.comment = ` ${varDef.title}${varDef.description ? `: ${varDef.description}` : ''}`;

            const paths = [...path].reverse();

            let prevPart: yaml.Node | yaml.Document | yaml.Pair = node;

            for (const pathPart of paths) {
              if (yaml.isCollection(pathPart)) {
                // If only one items in the collection comment the whole collection
                if (pathPart.items.length === 1) {
                  continue;
                }
              }
              if (yaml.isSeq(pathPart)) {
                const commentDoc = new yaml.Document(new yaml.YAMLSeq());
                commentDoc.add(prevPart);
                const commentStr = commentDoc.toString().trimEnd();
                pathPart.comment = pathPart.comment
                  ? `${pathPart.comment} ${commentStr}`
                  : ` ${commentStr}`;
                const keyToDelete = prevPart;

                toDeleteFn.push(() => {
                  pathPart.items.forEach((item, index) => {
                    if (item === keyToDelete) {
                      pathPart.delete(new yaml.Scalar(index));
                    }
                  });
                });
                return;
              }

              if (yaml.isMap(pathPart)) {
                if (yaml.isPair(prevPart)) {
                  const commentDoc = new yaml.Document(new yaml.YAMLMap());
                  commentDoc.add(prevPart);
                  const commentStr = commentDoc.toString().trimEnd();

                  pathPart.comment = pathPart.comment
                    ? `${pathPart.comment}\n ${commentStr.toString()}`
                    : ` ${commentStr.toString()}`;
                  const keyToDelete = prevPart.key;
                  toDeleteFn.push(() => pathPart.delete(keyToDelete));
                }
                return;
              }

              prevPart = pathPart;
            }
          }
        }
      }
    },
  });

  toDeleteFn.forEach((deleteFn) => deleteFn());
}
