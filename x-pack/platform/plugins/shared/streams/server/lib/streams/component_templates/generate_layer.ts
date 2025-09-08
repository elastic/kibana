/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  MappingDateProperty,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  AllowedMappingProperty,
  StreamsMappingProperties,
} from '@kbn/streams-schema/src/fields';
import type { Streams } from '@kbn/streams-schema';
import { getAdvancedParameters, isRoot, namespacePrefixes } from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import { logsSettings, otelEquivalentLookupMap } from './logs_layer';
import { getComponentTemplateName } from './name';
import { baseMappings } from './logs_layer';

export function generateLayer(
  name: string,
  definition: Streams.WiredStream.Definition,
  isServerless: boolean
): ClusterPutComponentTemplateRequest {
  const properties: StreamsMappingProperties = {};
  const aliases: MappingTypeMapping['properties'] = {};
  Object.entries(definition.ingest.wired.fields).forEach(([field, props]) => {
    if (props.type === 'system') {
      return;
    }
    const property: AllowedMappingProperty = {
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
    const matchingPrefix = namespacePrefixes.find((prefix) => field.startsWith(prefix));
    if (matchingPrefix) {
      const aliasName = field.substring(matchingPrefix.length);
      aliases[aliasName] = {
        type: 'alias',
        path: field,
      };
    }
  });

  // check whether the field has an otel equivalent. If yes, set the ECS equivalent as an alias
  // This needs to be done after the initial properties are set, so the ECS equivalent aliases win out
  Object.entries(definition.ingest.wired.fields).forEach(([field, props]) => {
    const matchingPrefix = namespacePrefixes.find((prefix) => field.startsWith(prefix));
    if (matchingPrefix) {
      const aliasName = field.substring(matchingPrefix.length);
      const otelEquivalent = otelEquivalentLookupMap[aliasName];
      if (otelEquivalent) {
        aliases[otelEquivalent] = {
          type: 'alias',
          path: field,
        };
      }
    }
  });

  return {
    name: getComponentTemplateName(name),
    template: {
      settings: getTemplateSettings(definition, isServerless),
      mappings: {
        dynamic: false,
        properties: isRoot(name)
          ? {
              ...baseMappings,
              ...properties,
              ...aliases,
            }
          : { ...properties, ...aliases },
      },
    },
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `Default settings for the ${name} stream`,
    },
  };
}

function getTemplateSettings(definition: Streams.WiredStream.Definition, isServerless: boolean) {
  const baseSettings = isRoot(definition.name) ? logsSettings : {};
  return baseSettings;
}
