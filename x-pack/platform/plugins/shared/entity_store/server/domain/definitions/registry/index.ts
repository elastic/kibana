/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  EntityDefinitionRegistry,
  ENTITY_DEFINITION_TYPE_PATTERN,
  ENTITY_DEFINITION_TYPE_MAX_LENGTH,
} from './entity_definition_registry';
export type {
  RegistrableEntityDefinition,
  RegisteredEntityDefinition,
  RegisterResult,
  RegistrationRejection,
} from './entity_definition_registry';
