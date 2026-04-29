/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { PackagePolicy, PackagePolicyConfigRecord } from '../../../../common';

export const migrateSyntheticsPackagePolicyToV8100: SavedObjectModelDataBackfillFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  if (
    packagePolicyDoc.attributes.package?.name !== 'synthetics' ||
    !packagePolicyDoc.attributes.is_managed
  ) {
    return packagePolicyDoc;
  }
  const updatedAttributes = packagePolicyDoc.attributes;

  const enabledInput = updatedAttributes.inputs.find((input) => input.enabled === true);
  const enabledStream = enabledInput?.streams.find((stream) => {
    return ['browser', 'http', 'icmp', 'tcp'].includes(stream.data_stream.dataset);
  });
  if (!enabledStream) {
    return {
      attributes: updatedAttributes,
    };
  }

  if (enabledStream.vars) {
    const processors = processorsFormatter(enabledStream.vars);
    enabledStream.vars.processors = { value: processors, type: 'yaml' };
    enabledStream.compiled_stream.processors = processors;
  }

  return {
    attributes: updatedAttributes,
  };
};

type Fields = Record<string, string | boolean>;

interface FieldProcessor {
  add_fields: {
    target: string;
    fields: Fields;
  };
}

export const processorsFormatter = (vars: PackagePolicyConfigRecord) => {
  const fields: Fields = {
    'monitor.fleet_managed': true,
  };
  if (vars.test_run_id?.value) {
    fields.test_run_id = vars.test_run_id.value;
  }
  if (vars.run_once?.value) {
    fields.run_once = vars.run_once.value;
  }
  if (vars.config_id?.value) {
    fields.config_id = vars.config_id.value;
  }
  const projName = vars['monitor.project.name']?.value;
  if (projName) {
    fields['monitor.project.name'] = projName;
  }
  const projId = vars['monitor.project.id']?.value;
  if (projId) {
    fields['monitor.project.id'] = projId;
  }
  const monId = vars['monitor.id']?.value;
  if (monId) {
    fields['monitor.id'] = monId;
  }
  const processors: FieldProcessor[] = [
    {
      add_fields: {
        fields,
        target: '',
      },
    },
  ];

  return JSON.stringify(processors);
};
