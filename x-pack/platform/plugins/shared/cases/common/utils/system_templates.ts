/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Template ids (the `templateId` attribute, at most 36 characters) of templates Cases ships start
 * with this; they can be turned off but not deleted.
 */
export const SYSTEM_TEMPLATE_ID_PREFIX = 'system-';

export const isSystemTemplateId = (templateId: string) =>
  templateId.startsWith(SYSTEM_TEMPLATE_ID_PREFIX);
