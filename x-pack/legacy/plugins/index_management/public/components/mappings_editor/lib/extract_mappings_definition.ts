/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isPlainObject } from 'lodash';

import { GenericObject } from '../types';
import { validateMappingsConfiguration, VALID_MAPPINGS_PARAMETERS } from './mappings_validator';

interface MappingsWithType {
  type?: string;
  mappings: GenericObject;
}

const isMappingDefinition = (obj: GenericObject): boolean => {
  const areAllKeysValid = Object.keys(obj).every(key => VALID_MAPPINGS_PARAMETERS.includes(key));

  if (!areAllKeysValid) {
    return false;
  }

  const { properties, dynamic_templates: dynamicTemplates, ...mappingsConfiguration } = obj;

  const { errors } = validateMappingsConfiguration(mappingsConfiguration);
  const isConfigurationValid = errors.length === 0;
  const isPropertiesValid = properties === undefined || isPlainObject(properties);
  const isDynamicTemplatesValid = dynamicTemplates === undefined || Array.isArray(dynamicTemplates);

  // If the configuration, the properties and the dynamic templates are valid
  // we can assume that the mapping is declared at root level (no types)
  return isConfigurationValid && isPropertiesValid && isDynamicTemplatesValid;
};

const getMappingsDefinitionWithType = (mappings: GenericObject): MappingsWithType[] => {
  if (isMappingDefinition(mappings)) {
    // No need to go any further
    return [{ mappings }];
  }

  // At this point there must be one or more type mappings
  const typedMappings = Object.entries(mappings).reduce(
    (acc: Array<{ type: string; mappings: GenericObject }>, [type, value]) => {
      if (isMappingDefinition(value)) {
        acc.push({ type, mappings: value as GenericObject });
      }
      return acc;
    },
    []
  );

  return typedMappings;
};

export const doMappingsHaveType = (mappings: GenericObject = {}): boolean =>
  getMappingsDefinitionWithType(mappings).filter(({ type }) => type !== undefined).length > 0;
