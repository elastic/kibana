/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionVariable } from '@kbn/alerting-plugin/common';
import * as i18n from './translations';

export const casesVars: ActionVariable[] = [
  { name: 'case.title', description: i18n.CASE_TITLE_DESC, useWithTripleBracesInTemplates: true },
  {
    name: 'case.description',
    description: i18n.CASE_DESCRIPTION_DESC,
    useWithTripleBracesInTemplates: true,
  },
  { name: 'case.tags', description: i18n.CASE_TAGS_DESC, useWithTripleBracesInTemplates: true },
  { name: 'case.id', description: i18n.CASE_ID_DESC, useWithTripleBracesInTemplates: true },
  {
    name: 'case.status',
    description: i18n.CASE_SEVERITY_DESC,
    useWithTripleBracesInTemplates: true,
  },
  {
    name: 'case.severity',
    description: i18n.CASE_STATUS_DESC,
    useWithTripleBracesInTemplates: true,
  },
];

export const commentVars: ActionVariable[] = [
  {
    name: 'case.comment',
    description: i18n.CASE_COMMENT_DESC,
    useWithTripleBracesInTemplates: true,
  },
];

export const urlVars: ActionVariable[] = [
  {
    name: 'external.system.id',
    description: i18n.EXTERNAL_ID_DESC,
    useWithTripleBracesInTemplates: true,
  },
];

export const urlVarsExt: ActionVariable[] = [
  ...urlVars,
  {
    name: 'external.system.title',
    description: i18n.EXTERNAL_TITLE_DESC,
    useWithTripleBracesInTemplates: true,
  },
];
