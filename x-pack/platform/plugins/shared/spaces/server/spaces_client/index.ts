/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ISpacesClient } from './spaces_client';
export { SpacesClient } from './spaces_client';
export type {
  SpacesClientServiceSetup,
  SpacesClientServiceStart,
  SpacesClientRepositoryFactory,
  SpacesClientWrapper,
} from './spaces_client_service';
export { SpacesClientService } from './spaces_client_service';
