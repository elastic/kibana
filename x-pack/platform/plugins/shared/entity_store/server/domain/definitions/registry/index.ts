/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { EntityDefinitionRegistry } from './entity_definition_registry';
export {
  ENTITY_DEFINITION_TYPE_PATTERN,
  ENTITY_DEFINITION_TYPE_MAX_LENGTH,
} from '../../../../common/domain/definitions/entity_schema';
export type {
  RegistrableEntityDefinition,
  RegisteredEntityDefinition,
  RegisterResult,
  RegistrationRejection,
} from './entity_definition_registry';
export { createEntityDefinitionsClient } from './entity_definitions_client';
export type { EntityDefinitionsClient } from './entity_definitions_client';
