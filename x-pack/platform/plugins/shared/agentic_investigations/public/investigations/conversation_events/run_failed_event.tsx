/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { ConversationEventUIDefinition } from '@kbn/agent-builder-browser';
import {
  INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  type InvestigationRunFailedEventData,
} from '../../../common/investigations/run_failure';

const contentStyles = css`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

export const investigationRunFailedEventUiDefinition: ConversationEventUIDefinition<
  typeof INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  InvestigationRunFailedEventData
> = {
  type: INVESTIGATION_RUN_FAILED_EVENT_TYPE,
  getHeader: () => ({
    icon: 'warning',
    iconTitle: i18n.translate(
      'xpack.agenticInvestigations.investigations.events.runFailedIconAriaLabel',
      { defaultMessage: 'Investigation run failed' }
    ),
    label: i18n.translate('xpack.agenticInvestigations.investigations.events.runFailedLabel', {
      defaultMessage: 'Investigation run failed',
    }),
  }),
  render: ({ data }) => (
    <EuiText size="s" data-test-subj="investigationRunFailedEvent">
      <dl>
        <dt>
          <FormattedMessage
            id="xpack.agenticInvestigations.investigations.events.failedRequestLabel"
            defaultMessage="Request"
          />
        </dt>
        <dd css={contentStyles} data-test-subj="investigationRunFailedRequest">
          {data.request ?? (
            <FormattedMessage
              id="xpack.agenticInvestigations.investigations.events.failedRequestUnavailableDescription"
              defaultMessage="Original request unavailable."
            />
          )}
        </dd>
        <dt>
          <FormattedMessage
            id="xpack.agenticInvestigations.investigations.events.failureReasonLabel"
            defaultMessage="Failure reason"
          />
        </dt>
        <dd css={contentStyles} data-test-subj="investigationRunFailedReason">
          {data.reason}
        </dd>
      </dl>
    </EuiText>
  ),
};
