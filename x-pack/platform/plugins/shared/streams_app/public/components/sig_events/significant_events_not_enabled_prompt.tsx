/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SignificantEventsUnavailableReason } from '@kbn/streams-plugin/common';
import React from 'react';

export function SignificantEventsNotEnabledPrompt({
  reason,
}: {
  reason: SignificantEventsUnavailableReason;
}) {
  return (
    <EuiEmptyPrompt
      data-test-subj="streamsSignificantEventsNotEnabledPrompt"
      iconType="bell"
      color="subdued"
      title={
        <h2>
          {i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.title', {
            defaultMessage: 'Significant events is not enabled',
          })}
        </h2>
      }
      body={
        <EuiText>
          <p>{getBodyMessage(reason)}</p>
        </EuiText>
      }
    />
  );
}

function getBodyMessage(reason: SignificantEventsUnavailableReason): string {
  switch (reason) {
    case 'pricing_tier':
      return i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.pricingTierBody', {
        defaultMessage: 'Significant events is not available on the current pricing tier.',
      });
    case 'license':
      return i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.licenseBody', {
        defaultMessage: 'An Enterprise license or higher is required to use significant events.',
      });
    case 'ui_setting':
      return i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.uiSettingBody', {
        defaultMessage:
          'Significant events is disabled. Enable it in Advanced Settings to start using it.',
      });
    case 'workflowsExtensions':
    case 'workflowsManagement':
      return i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.workflowsBody', {
        defaultMessage:
          'Significant events relies on Workflows, which is not available in this environment.',
      });
    case 'searchInferenceEndpoints':
      return i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.inferenceBody', {
        defaultMessage:
          'Significant events requires inference connectors, which are not available in this environment.',
      });
    case 'agentBuilder':
      return i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.agentBuilderBody', {
        defaultMessage:
          'Significant events relies on Agent Builder, which is not available in this environment.',
      });
    default:
      return i18n.translate('xpack.streams.significantEvents.notEnabledPrompt.genericBody', {
        defaultMessage:
          'Significant events is not available in this environment. Check that your license, pricing tier, settings and required features are enabled.',
      });
  }
}
