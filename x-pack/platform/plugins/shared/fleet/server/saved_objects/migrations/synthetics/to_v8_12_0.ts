/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

export const migrateSyntheticsPackagePolicyToV8120: SavedObjectModelDataBackfillFn<
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
  const namespace = packagePolicyDoc.namespace;

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
    const processors = processorsFormatter(enabledStream.vars.processors.value, namespace);
    enabledStream.vars.processors = { value: processors, type: 'yaml' };
    enabledStream.compiled_stream.processors = processors;
  }

  return {
    attributes: updatedAttributes,
  };
};

export const processorsFormatter = (processorsStr: string, namespace?: string) => {
  try {
    const processors = JSON.parse(processorsStr);
    processors[0].add_fields.fields.meta = { space_id: namespace };
    return JSON.stringify(processors);
  } catch (e) {
    return processorsStr;
  }
};
