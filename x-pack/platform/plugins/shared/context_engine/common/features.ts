/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONTEXT_ENGINE_FEATURE_ID = 'contextEngine';

export const CONTEXT_ENGINE_APP_ID = 'context_engine';
export const CONTEXT_ENGINE_APP_PATH = '/app/context_engine';

/**
 * Feature flag gating the Context Engine browser app. When disabled, the app is
 * hidden from navigation and global search.
 */
export const CONTEXT_ENGINE_ENABLED_FLAG = 'contextEngine.enabled';

export const apiPrivileges = {
  readContextEngine: `${CONTEXT_ENGINE_FEATURE_ID}:read`,
  writeContextEngine: `${CONTEXT_ENGINE_FEATURE_ID}:write`,
};

export const uiPrivileges = {
  show: 'show',
};
