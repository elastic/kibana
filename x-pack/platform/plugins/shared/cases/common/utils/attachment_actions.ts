/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Action types for entries in {@link AttachmentViewObject.getActions}. Lives
 * in `common/` so solutions can reference the enum without pulling the cases
 * public barrel into their page-load bundle.
 */
export enum AttachmentActionType {
  BUTTON = 'button',
  CUSTOM = 'custom',
}
