/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const NIGHTSHIFT_FEATURE_ID = 'nightshift';

export const NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES = {
  read: 'read_nightshift_context_engine',
  manage: 'manage_nightshift_context_engine',
} as const;

export const NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES = {
  read: 'read_nightshift_detection_engine',
  manage: 'manage_nightshift_detection_engine',
} as const;

export const NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES = {
  read: 'read_nightshift_investigation_engine',
  manage: 'manage_nightshift_investigation_engine',
} as const;

export const NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES = {
  show: 'context_engine_show',
  manage: 'context_engine_manage',
} as const;

export const NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES = {
  show: 'detection_engine_show',
  manage: 'detection_engine_manage',
} as const;

export const NIGHTSHIFT_INVESTIGATION_ENGINE_UI_PRIVILEGES = {
  show: 'investigation_engine_show',
  manage: 'investigation_engine_manage',
} as const;

export const NIGHTSHIFT_CONTEXT_ENGINE_SUB_FEATURE_PRIVILEGES = {
  all: 'context_engine_all',
  read: 'context_engine_read',
} as const;

export const NIGHTSHIFT_DETECTION_ENGINE_SUB_FEATURE_PRIVILEGES = {
  all: 'detection_engine_all',
  read: 'detection_engine_read',
} as const;

export const NIGHTSHIFT_INVESTIGATION_ENGINE_SUB_FEATURE_PRIVILEGES = {
  all: 'investigation_engine_all',
  read: 'investigation_engine_read',
} as const;

export const NIGHTSHIFT_ANY_ENGINE_READ_PRIVILEGES = [
  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.read,
  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.read,
  NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES.read,
] as const;

export const NIGHTSHIFT_ANY_ENGINE_MANAGE_PRIVILEGES = [
  NIGHTSHIFT_CONTEXT_ENGINE_API_PRIVILEGES.manage,
  NIGHTSHIFT_DETECTION_ENGINE_API_PRIVILEGES.manage,
  NIGHTSHIFT_INVESTIGATION_ENGINE_API_PRIVILEGES.manage,
] as const;
