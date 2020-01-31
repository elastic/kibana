/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isPlainObject } from 'lodash';

import { GenericObject } from '../types';
import { validateMappingsConfiguration, VALID_MAPPINGS_PARAMETERS } from './mappings_validator';

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

/**
 * 5.x index templates can be created with multiple types.
 * e.g.
 ```
  const mappings = {
      type1: {
        properties: {
          name1: {
            type: 'keyword',
          },
        },
      },
      type2: {
        properties: {
          name2: {
            type: 'keyword',
          },
        },
      },
    };
 ```
 * A mappings can also be declared under an explicit "_doc" property.
 ```
 const mappings = {
    _doc: {
      _source: {
        "enabled": false
      },
      properties: {
        name1: {
          type: 'keyword',
        },
      },
    },
  };
 ```
 * This helpers parse the mappings provided an removes any possible mapping "type" declared
 *
 * @param mappings The mappings object to validate
 */
export const extractMappingsDefinition = (mappings: GenericObject = {}): GenericObject | null => {
  if (isMappingDefinition(mappings)) {
    // No need to go any further
    return mappings;
  }

  // At this point there must be one or more type mappings
  const typedMappings = Object.values(mappings).reduce((acc: GenericObject[], value) => {
    if (isMappingDefinition(value)) {
      acc.push(value as GenericObject);
    }
    return acc;
  }, []);

  // If there are no typed mappings found this means that one of the type must did not pass
  // the "isMappingDefinition()" validation.
  // In theory this should never happen but let's make sure the UI does not try to load an invalid mapping
  if (typedMappings.length === 0) {
    return null;
  }

  // If there's only one mapping type then we can consume it as if the type doesn't exist.
  if (typedMappings.length === 1) {
    return typedMappings[0];
  }

  // If there's more than one mapping type, then the mappings object isn't usable.
  return null;
};
