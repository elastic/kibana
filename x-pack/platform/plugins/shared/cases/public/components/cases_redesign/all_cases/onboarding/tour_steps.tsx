/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { CasesTourStep } from '../../../tour/types';
import * as i18n from './translations';

export const CASES_LIST_TOUR_TEST_ID_PREFIX = 'cases-list-tour-step';

const wrap = (text: string) => (
  <EuiText size="s">
    <p>{text}</p>
  </EuiText>
);

export const CASES_LIST_TOUR_STEPS: CasesTourStep[] = [
  {
    stepId: 'viewToggle',
    title: i18n.STEP_VIEW_TOGGLE_TITLE,
    anchor: '[data-test-subj="cases-view-toggle"]',
    anchorPosition: 'downRight',
    content: wrap(i18n.STEP_VIEW_TOGGLE_DESCRIPTION),
  },
  {
    stepId: 'fields',
    title: i18n.STEP_FIELDS_TITLE,
    anchor: '[data-test-subj="column-selection-popover-button"]',
    anchorPosition: 'downRight',
    content: wrap(i18n.STEP_FIELDS_DESCRIPTION),
  },
  {
    stepId: 'templates',
    title: i18n.STEP_TEMPLATES_TITLE,
    anchor: '[data-test-subj="cases-templates-button"]',
    anchorPosition: 'downCenter',
    content: wrap(i18n.STEP_TEMPLATES_DESCRIPTION),
  },
  {
    stepId: 'settings',
    title: i18n.STEP_SETTINGS_TITLE,
    anchor: '[data-test-subj="configure-case-button"]',
    anchorPosition: 'downCenter',
    content: wrap(i18n.STEP_SETTINGS_DESCRIPTION),
  },
];
