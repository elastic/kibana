/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { applyTemplateStrings } from '../../i18n/templates';

import darkTemplate from './theme_dark.json';
import lightTemplate from './theme_light.json';
import pitchTemplate from './pitch_presentation.json';
import statusTemplate from './status_report.json';
import summaryTemplate from './summary_report.json';

// Registry expects a function that returns a spec object
export const templateSpecs = applyTemplateStrings([
  darkTemplate,
  lightTemplate,
  pitchTemplate,
  statusTemplate,
  summaryTemplate,
]);
