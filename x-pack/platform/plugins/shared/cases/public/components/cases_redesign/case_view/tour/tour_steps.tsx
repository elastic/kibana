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

export const CASE_DETAILS_TOUR_STEP_TEST_ID = 'cases-case-details-tour-step';

const wrap = (text: string) => (
  <EuiText size="s">
    <p>{text}</p>
  </EuiText>
);

export interface CaseDetailsTourConditions {
  canCreateComment: boolean;
  canUpdate: boolean;
  /** Whether the current solution enables any case setting; gates the settings step. */
  hasCaseSettings: boolean;
  /** Whether the "Add to chat" action is available; gates the chat step. */
  isAddToChatAvailable: boolean;
  isTemplatesEnabled: boolean;
  isConnectorAuthorized: boolean;
}

/**
 * Builds the case-details tour steps, including only those whose target is actually rendered for
 * the current case/permissions/config. Steps whose anchor still isn't in the DOM when reached are
 * skipped by the tour engine's anchor guard (e.g. the connector section while it loads, or the
 * settings button when the header menu overflows on narrow viewports).
 *
 * TODO: add a "Legacy fields" step once the legacy-fields sidebar section lands (elastic/kibana#279460).
 */
export const getCaseDetailsTourSteps = ({
  canCreateComment,
  canUpdate,
  hasCaseSettings,
  isAddToChatAvailable,
  isTemplatesEnabled,
  isConnectorAuthorized,
}: CaseDetailsTourConditions): CasesTourStep[] => {
  const steps: CasesTourStep[] = [];

  if (canCreateComment) {
    steps.push({
      stepId: 'attach',
      title: i18n.STEP_ATTACH_TITLE,
      anchor: '[data-test-subj="case-view-attach-button"]',
      anchorPosition: 'downCenter',
      content: wrap(i18n.STEP_ATTACH_DESCRIPTION),
    });
  }

  if (isAddToChatAvailable) {
    steps.push({
      stepId: 'chat',
      title: i18n.STEP_CHAT_TITLE,
      anchor: '[data-test-subj="case-chat-actions"]',
      anchorPosition: 'downLeft',
      content: wrap(i18n.STEP_CHAT_DESCRIPTION),
    });
  }

  steps.push({
    stepId: 'pills',
    title: i18n.STEP_PILLS_TITLE,
    // Anchor to the severity badge (the leftmost pill); the copy covers both pills.
    anchor: '[data-test-subj="case-view-severity-badge"]',
    anchorPosition: 'downLeft',
    content: wrap(i18n.STEP_PILLS_DESCRIPTION),
  });

  if (canUpdate && hasCaseSettings) {
    steps.push({
      stepId: 'settings',
      title: i18n.STEP_SETTINGS_TITLE,
      anchor: '[data-test-subj="case-settings-button"]',
      anchorPosition: 'downRight',
      content: wrap(i18n.STEP_SETTINGS_DESCRIPTION),
    });
  }

  steps.push({
    stepId: 'attributes',
    title: i18n.STEP_ATTRIBUTES_TITLE,
    anchor: '[data-test-subj="case-view-sidebar-attributes"]',
    anchorPosition: 'leftUp',
    content: wrap(i18n.STEP_ATTRIBUTES_DESCRIPTION),
  });

  if (isTemplatesEnabled) {
    steps.push({
      stepId: 'templateFields',
      title: i18n.STEP_TEMPLATE_FIELDS_TITLE,
      anchor: '[data-test-subj="case-view-sidebar-template-fields"]',
      anchorPosition: 'leftUp',
      content: wrap(i18n.STEP_TEMPLATE_FIELDS_DESCRIPTION),
    });
  }

  if (isConnectorAuthorized) {
    steps.push({
      stepId: 'connector',
      title: i18n.STEP_CONNECTOR_TITLE,
      anchor: '[data-test-subj="case-view-sidebar-connectors"]',
      anchorPosition: 'leftUp',
      content: wrap(i18n.STEP_CONNECTOR_DESCRIPTION),
    });
  }

  return steps;
};
