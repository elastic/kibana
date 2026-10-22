/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type {
  ConversationEventUIDefinition,
  ConversationEventsServiceStartContract,
} from '@kbn/agent-builder-browser';
import { getEventActorDisplayName } from '@kbn/agent-builder-common';
import { SEVERITY_LABELS } from '@kbn/agentic-investigations-common';
import {
  INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE,
  type InvestigationSeverityChangedEventData,
} from '../../../common/investigations/severity_change';

const UNKNOWN_ACTOR = i18n.translate(
  'xpack.agenticInvestigations.investigations.events.unknownActor',
  { defaultMessage: 'A user' }
);

export const investigationSeverityChangedEventUiDefinition: ConversationEventUIDefinition<
  typeof INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE,
  InvestigationSeverityChangedEventData
> = {
  type: INVESTIGATION_SEVERITY_CHANGED_EVENT_TYPE,
  getHeader: () => ({
    icon: 'warning',
    label: i18n.translate('xpack.agenticInvestigations.investigations.events.severityHeader', {
      defaultMessage: 'Severity changed',
    }),
  }),
  render: ({ data, actor }) => {
    const user = getEventActorDisplayName(actor) ?? UNKNOWN_ACTOR;
    const severity = <strong>{SEVERITY_LABELS[data.severity]}</strong>;
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationSeverityChangedEvent">
        {data.previous_severity ? (
          <FormattedMessage
            id="xpack.agenticInvestigations.investigations.events.severityChangedFrom"
            defaultMessage="{user} changed the severity from {previous} to {severity}"
            values={{
              user,
              previous: <strong>{SEVERITY_LABELS[data.previous_severity]}</strong>,
              severity,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.agenticInvestigations.investigations.events.severitySet"
            defaultMessage="{user} set the severity to {severity}"
            values={{ user, severity }}
          />
        )}
      </EuiText>
    );
  },
};

export const registerInvestigationConversationEventUiDefinitions = (
  conversationEvents: ConversationEventsServiceStartContract
): void => {
  conversationEvents.register(investigationSeverityChangedEventUiDefinition);
};
