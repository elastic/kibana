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
import {
  STATUS_CHANGED_EVENT_TYPE,
  type StatusChangedEventData,
} from '../../../common/investigations/conversation_events';

const statusLabels = {
  open: i18n.translate('xpack.agenticInvestigations.statusEvents.open', {
    defaultMessage: 'Open',
  }),
  closed: i18n.translate('xpack.agenticInvestigations.statusEvents.closed', {
    defaultMessage: 'Closed',
  }),
};

export const createStatusChangedEventUiDefinition = (): ConversationEventUIDefinition<
  typeof STATUS_CHANGED_EVENT_TYPE,
  StatusChangedEventData
> => ({
  type: STATUS_CHANGED_EVENT_TYPE,
  getHeader: ({ data }) => ({
    icon: 'user',
    label: i18n.translate('xpack.agenticInvestigations.statusEvents.headerLabel', {
      defaultMessage: 'Status',
    }),
  }),
  render: ({ data }) => (
    <>
      <EuiText size="s" color="primary" data-test-subj="statusChangedEvent">
        {data.from ? (
          <FormattedMessage
            id="xpack.agenticInvestigations.statusEvents.changed"
            defaultMessage="Status changed from {from} to {to}"
            values={{
              from: <strong>{statusLabels[data.from]}</strong>,
              to: <strong>{statusLabels[data.to]}</strong>,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.agenticInvestigations.statusEvents.set"
            defaultMessage="Status set to {to}"
            values={{ to: <strong>{statusLabels[data.to]}</strong> }}
          />
        )}
      </EuiText>
    </>
  ),
});

export const registerStatusConversationEventUiDefinitions = ({
  conversationEvents,
}: {
  conversationEvents: ConversationEventsServiceStartContract;
}): void => {
  conversationEvents.register(createStatusChangedEventUiDefinition());
};
