/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

import { alertMappings } from '../../common/saved_objects/rules/mappings';

export const ruleTemplateMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    ...pick(alertMappings.properties, ['name', 'tags', 'consumer']),
    ruleTypeId: alertMappings.properties.alertTypeId,
  },
};
