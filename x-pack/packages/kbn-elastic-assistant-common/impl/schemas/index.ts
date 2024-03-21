/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// API versioning constants
export const API_VERSIONS = {
  public: {
    v1: '2023-10-31',
  },
  internal: {
    v1: '1',
  },
};

export const PUBLIC_API_ACCESS = 'public';
export const INTERNAL_API_ACCESS = 'internal';

// Evaluation Schemas
export * from './evaluation/post_evaluate_route.gen';
export * from './evaluation/get_evaluate_route.gen';

// Capabilities Schemas
export * from './capabilities/get_capabilities_route.gen';

// Conversations Schemas
export * from './conversations/bulk_crud_conversations_route.gen';
export * from './conversations/common_attributes.gen';
export * from './conversations/crud_conversation_route.gen';
export * from './conversations/find_conversations_route.gen';

// Actions Connector Schemas
export * from './actions_connector/post_actions_connector_execute_route.gen';

// KB Schemas
export * from './knowledge_base/crud_kb_route.gen';
