/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { keyBy } from 'lodash';

import type {
  NewPackagePolicy,
  PackagePolicyInput,
  PackagePolicyInputStream,
  PackagePolicyConfigRecordEntry,
  PackageInfo,
  RegistryStream,
  RegistryVarsEntry,
  RegistryRequiredVars,
  NewPackagePolicyInputStream,
} from '../types';

import { DATASET_VAR_NAME } from '../constants';

import {
  isValidNamespace,
  doesPackageHaveIntegrations,
  getNormalizedInputs,
  getNormalizedDataStreams,
} from '.';
import { packageHasNoPolicyTemplates } from './policy_template';
import { isValidDataset } from './is_valid_namespace';

type Errors = string[] | null;

type ValidationEntry = Record<string, Errors>;
interface ValidationRequiredVarsEntry {
  name: string;
  invalid: boolean;
}
type ValidationRequiredVars = Record<string, ValidationRequiredVarsEntry[]>;

export interface PackagePolicyConfigValidationResults {
  required_vars?: ValidationRequiredVars | null;
  vars?: ValidationEntry;
}

export type PackagePolicyInputValidationResults = PackagePolicyConfigValidationResults & {
  streams?: Record<PackagePolicyInputStream['id'], PackagePolicyConfigValidationResults>;
};

export type PackagePolicyValidationResults = {
  name: Errors;
  description: Errors;
  namespace: Errors;
  additional_datastreams_permissions: Errors;
  inputs: Record<PackagePolicyInput['type'], PackagePolicyInputValidationResults> | null;
} & PackagePolicyConfigValidationResults;

const validatePackageRequiredVars = (
  stream: NewPackagePolicyInputStream,
  requiredVars?: RegistryRequiredVars
) => {
  const evaluatedRequiredVars: ValidationRequiredVars = {};

  if (!requiredVars || !stream.vars || !stream.enabled) {
    return null;
  }

  let hasMetRequiredCriteria = false;

  for (const [requiredVarDefinitionName, requiredVarDefinitionConstraints] of Object.entries(
    requiredVars
  )) {
    evaluatedRequiredVars[requiredVarDefinitionName] =
      requiredVarDefinitionConstraints?.map((constraint) => {
        return {
          name: constraint.name,
          invalid: true,
        };
      }) || [];

    if (evaluatedRequiredVars[requiredVarDefinitionName]) {
      requiredVarDefinitionConstraints.forEach((requiredCondition) => {
        if (stream.vars && stream.vars[requiredCondition.name]) {
          const varItem = stream.vars[requiredCondition.name];

          if (varItem) {
            if (
              (!requiredCondition.value && varItem.value) ||
              (requiredCondition.value &&
                varItem.value &&
                requiredCondition.value === varItem.value)
            ) {
              evaluatedRequiredVars[requiredVarDefinitionName] = evaluatedRequiredVars[
                requiredVarDefinitionName
              ].filter((item) => item.name !== requiredCondition.name);
            }
          }
        }
      });
    }

    if (evaluatedRequiredVars[requiredVarDefinitionName]?.length === 0) {
      hasMetRequiredCriteria = true;
    }
  }

  return hasMetRequiredCriteria ? null : evaluatedRequiredVars;
};

const VALIDATE_DATASTREAMS_PERMISSION_REGEX =
  /^(logs)|(metrics)|(traces)|(synthetics)|(profiling)-(.*)$/;

/*
 * Returns validation information for a given package policy and package info
 * Note: this method assumes that `packagePolicy` is correctly structured for the given package
 */
export const validatePackagePolicy = (
  packagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo,
  safeLoadYaml: (yaml: string) => any,
  spaceSettings?: { allowedNamespacePrefixes?: string[] }
): PackagePolicyValidationResults => {
  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  const validationResults: PackagePolicyValidationResults = {
    name: null,
    description: null,
    namespace: null,
    additional_datastreams_permissions: null,
    inputs: {},
    vars: {},
  };
  if (!packagePolicy.name.trim()) {
    validationResults.name = [
      i18n.translate('xpack.fleet.packagePolicyValidation.nameRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }

  if (packagePolicy?.namespace) {
    const namespaceValidation = isValidNamespace(
      packagePolicy?.namespace,
      true,
      spaceSettings?.allowedNamespacePrefixes
    );
    if (!namespaceValidation.valid && namespaceValidation.error) {
      validationResults.namespace = [namespaceValidation.error];
    }
  }

  if (packagePolicy?.additional_datastreams_permissions) {
    validationResults.additional_datastreams_permissions =
      packagePolicy?.additional_datastreams_permissions.reduce<null | string[]>(
        (acc, additionalDatastreamsPermission) => {
          if (!additionalDatastreamsPermission.match(VALIDATE_DATASTREAMS_PERMISSION_REGEX)) {
            if (!acc) {
              acc = [];
            }
            acc.push(
              `${additionalDatastreamsPermission} is not valid, should match ${VALIDATE_DATASTREAMS_PERMISSION_REGEX.toString()}`
            );
          }
          return acc;
        },
        null
      );
  }

  // Validate package-level vars
  const packageVarsByName = keyBy(packageInfo.vars || [], 'name');
  const packageVars = Object.entries(packagePolicy.vars || {});

  if (packageVars.length) {
    validationResults.vars = packageVars.reduce((results, [name, varEntry]) => {
      results[name] = validatePackagePolicyConfig(
        varEntry,
        packageVarsByName[name],
        name,
        safeLoadYaml
      );
      return results;
    }, {} as ValidationEntry);
  }

  if (!packageInfo?.policy_templates?.length || packageHasNoPolicyTemplates(packageInfo)) {
    validationResults.inputs = {};
    return validationResults;
  }

  // Build cache for fast var definition lookup
  const inputVarDefsByPolicyTemplateAndType = packageInfo.policy_templates.reduce<
    Record<string, Record<string, RegistryVarsEntry>>
  >((varDefs, policyTemplate) => {
    const inputs = getNormalizedInputs(policyTemplate);
    inputs.forEach((input) => {
      const varDefKey = hasIntegrations ? `${policyTemplate.name}-${input.type}` : input.type;

      if ((input.vars || []).length) {
        varDefs[varDefKey] = keyBy(input.vars || [], 'name');
      }
    });
    return varDefs;
  }, {});

  const dataStreams = getNormalizedDataStreams(packageInfo);
  const streamsByDatasetAndInput = dataStreams.reduce<Record<string, RegistryStream>>(
    (streams, dataStream) => {
      dataStream.streams?.forEach((stream) => {
        streams[`${dataStream.dataset}-${stream.input}`] = stream;
      });
      return streams;
    },
    {}
  );
  const streamVarDefsByDatasetAndInput = Object.entries(streamsByDatasetAndInput).reduce<
    Record<string, Record<string, RegistryVarsEntry>>
  >((varDefs, [path, stream]) => {
    varDefs[path] = keyBy(stream.vars || [], 'name');
    return varDefs;
  }, {});

  const streamRequiredVarsDefsByDataAndInput = Object.entries(streamsByDatasetAndInput).reduce<
    Record<string, RegistryRequiredVars | undefined>
  >((reqVarDefs, [path, stream]) => {
    reqVarDefs[path] = stream.required_vars;
    return reqVarDefs;
  }, {});

  // Validate each package policy input with either its own var fields and stream vars
  packagePolicy.inputs.forEach((input) => {
    if (!input.vars && !input.streams) {
      return;
    }
    const inputKey = hasIntegrations ? `${input.policy_template}-${input.type}` : input.type;
    const inputValidationResults: PackagePolicyInputValidationResults = {
      vars: undefined,
      streams: {},
    };

    // Validate input-level var fields
    const inputVars = Object.entries(input.vars || {});
    if (inputVars.length) {
      inputValidationResults.vars = inputVars.reduce((results, [name, configEntry]) => {
        results[name] = input.enabled
          ? validatePackagePolicyConfig(
              configEntry,
              (inputVarDefsByPolicyTemplateAndType[inputKey] ?? {})[name],
              name,
              safeLoadYaml
            )
          : null;
        return results;
      }, {} as ValidationEntry);
    } else {
      delete inputValidationResults.vars;
    }

    // Validate each input stream with var definitions
    if (input.streams.length) {
      input.streams.forEach((stream) => {
        const streamValidationResults: PackagePolicyConfigValidationResults = {};

        const streamVarDefs =
          streamVarDefsByDatasetAndInput[`${stream.data_stream.dataset}-${input.type}`];
        if (streamVarDefs && Object.keys(streamVarDefs).length) {
          streamValidationResults.vars = Object.keys(streamVarDefs).reduce((results, name) => {
            const configEntry = stream?.vars?.[name];

            results[name] =
              input.enabled && stream.enabled
                ? validatePackagePolicyConfig(
                    configEntry,
                    streamVarDefs[name],
                    name,
                    safeLoadYaml,
                    packageInfo.type
                  )
                : null;

            return results;
          }, {} as ValidationEntry);
        }

        if (stream.vars && stream.enabled) {
          const requiredVars = validatePackageRequiredVars(
            stream,
            streamRequiredVarsDefsByDataAndInput[`${stream.data_stream.dataset}-${input.type}`]
          );
          if (requiredVars) {
            streamValidationResults.required_vars = requiredVars;
          }
        }

        inputValidationResults.streams![stream.data_stream.dataset] = streamValidationResults;
      });
    } else {
      delete inputValidationResults.streams;
    }

    if (inputValidationResults.vars || inputValidationResults.streams) {
      validationResults.inputs![inputKey] = inputValidationResults;
    }
  });

  if (Object.entries(validationResults.inputs!).length === 0) {
    validationResults.inputs = {};
  }

  return validationResults;
};

export const validatePackagePolicyConfig = (
  configEntry: PackagePolicyConfigRecordEntry | undefined,
  varDef: RegistryVarsEntry,
  varName: string,
  safeLoadYaml: (yaml: string) => any,
  packageType?: string
): string[] | null => {
  const errors = [];

  const value = configEntry?.value;

  let parsedValue: any = value;

  if (typeof value === 'string') {
    parsedValue = value.trim();
  }

  if (varDef === undefined) {
    // TODO return validation error here once https://github.com/elastic/kibana/issues/125655 is fixed
    // eslint-disable-next-line no-console
    console.debug(`No variable definition for ${varName} found`);

    return null;
  }

  if (varDef.required) {
    if (parsedValue === undefined || (varDef.type === 'yaml' && parsedValue === '')) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.requiredErrorMessage', {
          defaultMessage: '{fieldName} is required',
          values: {
            fieldName: varDef.title || varDef.name,
          },
        })
      );
    }
  }

  if (varDef.secret === true && parsedValue && parsedValue.isSecretRef === true) {
    if (
      parsedValue.id === undefined ||
      parsedValue.id === '' ||
      typeof parsedValue.id !== 'string'
    ) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.invalidSecretReference', {
          defaultMessage: 'Secret reference is invalid, id must be a string',
        })
      );

      return errors;
    }
    return null;
  }

  if (varDef.type === 'yaml') {
    try {
      parsedValue = safeLoadYaml(value);
    } catch (e) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.invalidYamlFormatErrorMessage', {
          defaultMessage: 'Invalid YAML format',
        })
      );
    }
  }

  if (varDef.multi) {
    if (parsedValue && !Array.isArray(parsedValue)) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.invalidArrayErrorMessage', {
          defaultMessage: 'Invalid format for {fieldName}: expected array',
          values: {
            fieldName: varDef.title || varDef.name,
          },
        })
      );
      return errors;
    }
    if (varDef.required && Array.isArray(parsedValue)) {
      const hasEmptyString =
        varDef.type === 'text' &&
        parsedValue.some((item) => typeof item === 'string' && item.trim() === '');

      if (hasEmptyString || parsedValue.length === 0) {
        errors.push(
          i18n.translate('xpack.fleet.packagePolicyValidation.requiredErrorMessage', {
            defaultMessage: '{fieldName} is required',
            values: {
              fieldName: varDef.title || varDef.name,
            },
          })
        );
      }
    }
    if (varDef.type === 'text' && parsedValue) {
      const invalidStrings = parsedValue.filter((cand: any) => /^[*&]/.test(cand));
      // only show one error if multiple strings in array are invalid
      if (invalidStrings.length > 0) {
        errors.push(
          i18n.translate('xpack.fleet.packagePolicyValidation.quoteStringErrorMessage', {
            defaultMessage:
              'Strings starting with special YAML characters like * or & need to be enclosed in double quotes.',
          })
        );
      }
    }

    if (varDef.type === 'integer' && parsedValue) {
      const invalidIntegers = parsedValue.filter((val: any) => !Number.isInteger(Number(val)));
      // only show one error if multiple strings in array are invalid
      if (invalidIntegers.length > 0) {
        errors.push(
          i18n.translate('xpack.fleet.packagePolicyValidation.invalidIntegerMultiErrorMessage', {
            defaultMessage: 'Invalid integer',
          })
        );
      }
    }

    return errors.length ? errors : null;
  }

  if (varDef.type === 'text' && parsedValue && !Array.isArray(parsedValue)) {
    if (/^[*&]/.test(parsedValue)) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.quoteStringErrorMessage', {
          defaultMessage:
            'Strings starting with special YAML characters like * or & need to be enclosed in double quotes.',
        })
      );
    }
  }

  if (
    varDef.type === 'bool' &&
    parsedValue &&
    !['true', 'false'].includes(parsedValue.toString())
  ) {
    errors.push(
      i18n.translate('xpack.fleet.packagePolicyValidation.boolValueError', {
        defaultMessage: 'Boolean values must be either true or false',
      })
    );
  }

  if (varDef.type === 'integer' && parsedValue && !Array.isArray(parsedValue)) {
    if (!Number.isInteger(Number(parsedValue))) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.invalidIntegerErrorMessage', {
          defaultMessage: 'Invalid integer',
        })
      );
    }
  }

  if (varDef.type === 'select' && parsedValue !== undefined) {
    if (!varDef.options?.map((o) => o.value).includes(parsedValue)) {
      errors.push(
        i18n.translate('xpack.fleet.packagePolicyValidation.invalidSelectValueErrorMessage', {
          defaultMessage: 'Invalid value for select type',
        })
      );
    }
  }

  if (varName === DATASET_VAR_NAME && packageType === 'input' && parsedValue !== undefined) {
    const { valid, error } = isValidDataset(
      parsedValue.dataset ? parsedValue.dataset : parsedValue,
      false
    );
    if (!valid && error) {
      errors.push(error);
    }
  }

  return errors.length ? errors : null;
};

export const countValidationErrors = (
  validationResults:
    | PackagePolicyValidationResults
    | PackagePolicyInputValidationResults
    | PackagePolicyConfigValidationResults
): number => {
  const flattenedValidation = getFlattenedObject(validationResults);
  const errors = Object.values(flattenedValidation).filter((value) => Boolean(value)) || [];
  return errors.length;
};

export const validationHasErrors = (
  validationResults:
    | PackagePolicyValidationResults
    | PackagePolicyInputValidationResults
    | PackagePolicyConfigValidationResults
): boolean => {
  return countValidationErrors(validationResults) > 0;
};
