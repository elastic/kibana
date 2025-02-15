/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterPutComponentTemplateRequest,
  MappingDateProperty,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import {
  WiredStreamDefinition,
  getAdvancedParameters,
  isDslLifecycle,
  isIlmLifecycle,
  isRoot,
} from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import { logsSettings } from './logs_layer';
import { getComponentTemplateName } from './name';

export function generateLayer(
  name: string,
  definition: WiredStreamDefinition,
  isServerless: boolean
): ClusterPutComponentTemplateRequest {
  const properties: Record<string, MappingProperty> = {};
  Object.entries(definition.ingest.wired.fields).forEach(([field, props]) => {
    const property: MappingProperty = {
      type: props.type,
    };

    const advancedParameters = getAdvancedParameters(field, props);

    if (Object.keys(advancedParameters).length > 0) {
      Object.assign(property, advancedParameters);
    }

    if (field === '@timestamp') {
      // @timestamp can't ignore malformed dates as it's used for sorting in logsdb
      (property as MappingDateProperty).ignore_malformed = false;
    }
    if (props.type === 'date' && props.format) {
      (property as MappingDateProperty).format = props.format;
    }

    properties[field] = property;
  });

  return {
    name: getComponentTemplateName(name),
    template: {
      lifecycle: getTemplateLifecycle(definition, isServerless),
      settings: getTemplateSettings(definition, isServerless),
      mappings: {
        subobjects: false,
        dynamic: false,
        properties,
      },
    },
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `Default settings for the ${name} stream`,
    },
  };
}

function getTemplateLifecycle(definition: WiredStreamDefinition, isServerless: boolean) {
  const lifecycle = definition.ingest.lifecycle;
  if (isServerless) {
    // dlm cannot be disabled in serverless
    return {
      data_retention: isDslLifecycle(lifecycle) ? lifecycle.dsl.data_retention : undefined,
    };
  }

  if (isIlmLifecycle(lifecycle)) {
    return { enabled: false };
  }

  if (isDslLifecycle(lifecycle)) {
    return {
      enabled: true,
      data_retention: lifecycle.dsl.data_retention,
    };
  }

  return undefined;
}

function getTemplateSettings(definition: WiredStreamDefinition, isServerless: boolean) {
  const baseSettings = isRoot(definition.name) ? logsSettings : {};
  const lifecycle = definition.ingest.lifecycle;

  if (isServerless) {
    return baseSettings;
  }

  if (isIlmLifecycle(lifecycle)) {
    return {
      ...baseSettings,
      'index.lifecycle.prefer_ilm': true,
      'index.lifecycle.name': lifecycle.ilm.policy,
    };
  }

  if (isDslLifecycle(lifecycle)) {
    return {
      ...baseSettings,
      'index.lifecycle.prefer_ilm': false,
      'index.lifecycle.name': undefined,
    };
  }

  // don't specify any lifecycle property when lifecyle is disabled or inherited
  return baseSettings;
}
