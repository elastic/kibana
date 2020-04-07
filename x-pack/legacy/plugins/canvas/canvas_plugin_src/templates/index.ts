/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { applyTemplateStrings } from '../../i18n/templates';

import darkTemplateUrl from './theme_dark.json';
import lightTemplateUrl from './theme_light.json';
import pitchTemplateUrl from './pitch_presentation.json';
import statusTemplateUrl from './status_report.json';
import summaryTemplateUrl from './summary_report.json';

// Registry expects a function that returns a spec object
export const asyncTemplateSpecs = async () =>
  await applyTemplateStrings([
    darkTemplateUrl,
    lightTemplateUrl,
    pitchTemplateUrl,
    statusTemplateUrl,
    summaryTemplateUrl,
  ]);
