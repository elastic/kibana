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

// After the name, the tour sticks to tab headers and other stable, non-layout anchors: anchoring to
// a layout-critical editor panel makes EuiWrappingPopover reparent it on open, which yanks the
// validation-errors bar to the top of the page.
export const TEMPLATE_EDITOR_TOUR_STEPS: CasesTourStep[] = [
  {
    // First, because the name is the one field a template cannot be saved without, and it moved out
    // of the Configuration tab into the page title where it is easy to walk straight past.
    //
    // Anchored to the header's h1 (its only heading), not the title button inside it: the anchor
    // gets reparented into the popover, and clicking the button (which this step invites) swaps it
    // for an input — React then crashes removing a node that was moved out from under it. The h1
    // persists across that swap; only its children change.
    stepId: 'name',
    title: i18n.EDITOR_STEP_NAME_TITLE,
    anchor: '[data-test-subj="appHeader"] h1',
    anchorPosition: 'downLeft',
    content: wrap(i18n.EDITOR_STEP_NAME_DESCRIPTION),
  },
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
