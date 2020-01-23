/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isPlainObject } from 'lodash';

import { GenericObject } from '../types';
import { validateMappingsConfiguration } from './mappings_validator';

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
  const allowedParameters = [
    '_source',
    '_meta',
    '_routing',
    'dynamic',
    'numeric_detection',
    'date_detection',
    'dynamic_date_formats',
    'dynamic_templates',
    'properties',
  ];

  const areAllKeysValid = Object.keys(mappings).every(key => allowedParameters.includes(key));

  if (areAllKeysValid) {
    const { properties, dynamic_templates: dynamicTemplates, ...mappingsConfiguration } = mappings;

    const { errors } = validateMappingsConfiguration(mappingsConfiguration);
    const isConfigurationValid = errors.length === 0;
    const isPropertiesValid = properties === undefined || isPlainObject(properties);
    const isDynamicTemplatesValid =
      dynamicTemplates === undefined || Array.isArray(dynamicTemplates);

    // If the configuration, the properties and the dynamic templates are valid
    // we can assume that the mapping provided is valid, no need to check for multi-types.
    const isValidMapping = isConfigurationValid && isPropertiesValid && isDynamicTemplatesValid;

    if (isValidMapping) {
      return mappings;
    }
  }

  // Detect if multi-types mapping
  const mappingsFound = Object.entries(mappings).reduce(
    (acc: GenericObject[], [definitionKey, value]) => {
      const isDefinitionKeyAllowed = allowedParameters.includes(definitionKey);

      // If all of the keys of the object are valid mappings definition parameters
      // it is probably a mappings definition :)
      const areAllParametersValid =
        isPlainObject(value) &&
        Object.keys(value as GenericObject).every(key => allowedParameters.includes(key));

      if (!isDefinitionKeyAllowed || areAllParametersValid) {
        acc.push(value as GenericObject);
      }
      return acc;
    },
    []
  );

  return mappingsFound.length === 0
    ? mappings
    : mappingsFound.length === 1
    ? mappingsFound[0]
    : null; // If more than 1 mappings definition, return null
};
