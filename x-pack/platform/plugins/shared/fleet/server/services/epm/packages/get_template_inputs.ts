/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { merge } from 'lodash';
import { dump } from 'js-yaml';
import yamlDoc from 'yaml';

import { getNormalizedInputs, isIntegrationPolicyTemplate } from '../../../../common/services';

import {
  getStreamsForInputType,
  packageToPackagePolicy,
} from '../../../../common/services/package_to_package_policy';
import { getInputsWithStreamIds, _compilePackagePolicyInputs } from '../../package_policy';
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
import { _sortYamlKeys } from '../../../../common/services/full_agent_policy_to_yaml';

import { getFullInputStreams } from '../../agent_policies/package_policies_to_agent_inputs';

import { getPackageInfo } from '.';
import { getPackageAssetsMap } from './get';

type Format = 'yml' | 'json';

type PackageWithInputAndStreamIndexed = Record<
  string,
  RegistryInput & {
    streams: Record<
      string,
      RegistryStream & {
        data_stream: { type: string; dataset: string };
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

    const inputId = input.policy_template
      ? `${input.policy_template}-${input.type}`
      : `${input.type}`;
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
  prerelease?: boolean,
  ignoreUnverified?: boolean
): Promise<string>;
export async function getTemplateInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  format: 'json',
  prerelease?: boolean,
  ignoreUnverified?: boolean
): Promise<{ inputs: TemplateAgentPolicyInput[] }>;
export async function getTemplateInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  format: Format,
  prerelease?: boolean,
  ignoreUnverified?: boolean
) {
  const packageInfo = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName,
    pkgVersion,
    prerelease,
    ignoreUnverified,
  });

  const emptyPackagePolicy = packageToPackagePolicy(packageInfo, '');

  const inputsWithStreamIds = getInputsWithStreamIds(emptyPackagePolicy, undefined, true);

  const indexedInputsAndStreams = buildIndexedPackage(packageInfo);

  if (format === 'yml') {
    // Add a placeholder <VAR_NAME> to all variables without default value
    for (const inputWithStreamIds of inputsWithStreamIds) {
      const inputId = inputWithStreamIds.policy_template
        ? `${inputWithStreamIds.policy_template}-${inputWithStreamIds.type}`
        : inputWithStreamIds.type;

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

  const assetsMap = await getPackageAssetsMap({
    logger: appContextService.getLogger(),
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
  );

  if (format === 'json') {
    return { inputs };
  } else if (format === 'yml') {
    const yaml = dump(
      { inputs },
      {
        skipInvalid: true,
        sortKeys: _sortYamlKeys,
      }
    );
    return addCommentsToYaml(yaml, buildIndexedPackage(packageInfo), inputIdsDestinationMap);
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
          const inputId = `${policyTemplate.name}-${packageInput.type}`;

          const streams = getStreamsForInputType(
            packageInput.type,
            packageInfo,
            isIntegrationPolicyTemplate(policyTemplate) && policyTemplate.data_streams
              ? policyTemplate.data_streams
              : []
          ).reduce<
            Record<
              string,
              RegistryStream & {
                data_stream: { type: string; dataset: string };
              }
            >
          >((acc, stream) => {
            const streamId = `${packageInput.type}-${stream.data_stream.dataset}`;
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
  yaml: string,
  packageIndexInputAndStreams: PackageWithInputAndStreamIndexed,
  inputIdsDestinationMap: Map<string, { originalId: string; streams: Map<string, string> }>
) {
  const doc = yamlDoc.parseDocument(yaml);
  // Add input and streams comments
  const yamlInputs = doc.get('inputs');
  if (yamlDoc.isCollection(yamlInputs)) {
    yamlInputs.items.forEach((inputItem) => {
      if (!yamlDoc.isMap(inputItem)) {
        return;
      }
      const inputIdNode = inputItem.get('id', true);
      if (!yamlDoc.isScalar(inputIdNode)) {
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
        if (!yamlDoc.isCollection(yamlStreams)) {
          return;
        }
        yamlStreams.items.forEach((streamItem) => {
          if (!yamlDoc.isMap(streamItem)) {
            return;
          }
          const streamIdNode = streamItem.get('id', true);
          if (yamlDoc.isScalar(streamIdNode)) {
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

  return doc.toString();
}

function commentVariablesInYaml(rootNode: yamlDoc.Node, vars: RegistryVarsEntry[] = []) {
  // Node need to be deleted after the end of the visit to be able to visit every node
  const toDeleteFn: Array<() => void> = [];
  yamlDoc.visit(rootNode, {
    Scalar(key, node, path) {
      if (node.value) {
        const val = node.value.toString();
        for (const varDef of vars) {
          const placeholder = getPlaceholder(varDef);
          if (val.includes(placeholder)) {
            node.comment = ` ${varDef.title}${varDef.description ? `: ${varDef.description}` : ''}`;

            const paths = [...path].reverse();

            let prevPart: yamlDoc.Node | yamlDoc.Document | yamlDoc.Pair = node;

            for (const pathPart of paths) {
              if (yamlDoc.isCollection(pathPart)) {
                // If only one items in the collection comment the whole collection
                if (pathPart.items.length === 1) {
                  continue;
                }
              }
              if (yamlDoc.isSeq(pathPart)) {
                const commentDoc = new yamlDoc.Document(new yamlDoc.YAMLSeq());
                commentDoc.add(prevPart);
                const commentStr = commentDoc.toString().trimEnd();
                pathPart.comment = pathPart.comment
                  ? `${pathPart.comment} ${commentStr}`
                  : ` ${commentStr}`;
                const keyToDelete = prevPart;

                toDeleteFn.push(() => {
                  pathPart.items.forEach((item, index) => {
                    if (item === keyToDelete) {
                      pathPart.delete(new yamlDoc.Scalar(index));
                    }
                  });
                });
                return;
              }

              if (yamlDoc.isMap(pathPart)) {
                if (yamlDoc.isPair(prevPart)) {
                  const commentDoc = new yamlDoc.Document(new yamlDoc.YAMLMap());
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
