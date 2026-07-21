/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { CasesTourStep } from '../../tour/types';
import * as i18n from './translations';

export const TEMPLATE_EDITOR_TOUR_STEP_TEST_ID = 'cases-template-editor-tour-step';

const wrap = (text: string) => (
  <EuiText size="s">
    <p>{text}</p>
  </EuiText>
);

// The tour intentionally starts with the Configuration tab: its anchor is the tab header (a stable,
// non-layout element), which avoids EuiWrappingPopover reparenting a layout-critical editor panel on
// start — that reparenting would otherwise yank the validation-errors bar to the top of the page.
export const TEMPLATE_EDITOR_TOUR_STEPS: CasesTourStep[] = [
  {
    stepId: 'config',
    title: i18n.EDITOR_STEP_CONFIG_TITLE,
    anchor: '[data-test-subj="templateTabConfiguration"]',
    anchorPosition: 'downCenter',
    content: wrap(i18n.EDITOR_STEP_CONFIG_DESCRIPTION),
  },
  {
    stepId: 'yaml',
    title: i18n.EDITOR_STEP_YAML_TITLE,
    // Anchor to the Fields tab header (a stable, non-layout element) rather than the YAML editor
    // panel. Anchoring the popover to the editor panel caused EuiWrappingPopover to reparent a
    // layout-critical element, producing a visible UI shift in the editor when the step opened.
    anchor: '[data-test-subj="templateTabFields"]',
    anchorPosition: 'downCenter',
    content: wrap(i18n.EDITOR_STEP_YAML_DESCRIPTION),
  },
  {
    stepId: 'preview',
    title: i18n.EDITOR_STEP_PREVIEW_TITLE,
    anchor: '[data-test-subj="templatePreviewPanel"]',
    anchorPosition: 'leftUp',
    content: wrap(i18n.EDITOR_STEP_PREVIEW_DESCRIPTION),
  },
  {
    stepId: 'actions',
    title: i18n.EDITOR_STEP_ACTIONS_TITLE,
    anchor: '[data-test-subj="templateActionsMenuButton"]',
    anchorPosition: 'upRight',
    content: wrap(i18n.EDITOR_STEP_ACTIONS_DESCRIPTION),
  },
];
