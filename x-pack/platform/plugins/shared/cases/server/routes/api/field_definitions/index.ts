/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../../config';
import { getFieldDefinitionsRoute } from './get_field_definitions_route';
import { postFieldDefinitionRoute } from './post_field_definition_route';
import { putFieldDefinitionRoute } from './put_field_definition_route';
import { deleteFieldDefinitionRoute } from './delete_field_definition_route';
import { getPublicFieldDefinitionsRoute } from './get_public_field_definitions_route';
import { postPublicFieldDefinitionRoute } from './post_public_field_definition_route';
import { putPublicFieldDefinitionRoute } from './put_public_field_definition_route';
import { deletePublicFieldDefinitionRoute } from './delete_public_field_definition_route';

/**
 * Register field definition routes conditionally, based on feature flag
 */
export const getFieldDefinitionRoutes = (config: ConfigType) => {
  if (!config.templates.enabled) {
    return [];
  }

  return [
    getFieldDefinitionsRoute,
    postFieldDefinitionRoute,
    putFieldDefinitionRoute,
    deleteFieldDefinitionRoute,
  ];
};

/**
 * Register public field definition routes conditionally, based on feature flag
 */
export const getPublicFieldDefinitionRoutes = (config: ConfigType) => {
  if (!config.templates.enabled) {
    return [];
  }

  return [
    getPublicFieldDefinitionsRoute,
    postPublicFieldDefinitionRoute,
    putPublicFieldDefinitionRoute,
    deletePublicFieldDefinitionRoute,
  ];
};
