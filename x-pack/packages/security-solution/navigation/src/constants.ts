/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SECURITY_UI_APP_ID = 'securitySolutionUI' as const;

export { SecurityPageName } from '@kbn/deeplinks-security';

export enum LinkCategoryType {
  title = 'title',
  collapsibleTitle = 'collapsibleTitle',
  accordion = 'accordion',
  separator = 'separator',
}
