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
import type { ApplicationStart } from '@kbn/core/public';
import type {
  ConversationEventUIDefinition,
  ConversationEventsServiceStartContract,
} from '@kbn/agent-builder-browser';
import {
  ESCALATION_ATTACHMENTS_SYNCED_EVENT_TYPE,
  ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE,
  ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE,
  type EscalationAttachmentsSyncedEventData,
  type EscalationInvestigationEventData,
} from '../../../common/escalations/conversation_events';
import { InvestigationLink } from './investigation_link';

type Definition<
  TType extends string,
  TData = EscalationInvestigationEventData
> = ConversationEventUIDefinition<TType, TData>;

const getHeader = () => ({
  icon: 'flag',
  label: i18n.translate('xpack.agenticInvestigations.escalations.events.headerLabel', {
    defaultMessage: 'Escalation',
  }),
});

export const createEscalationConversationEventUiDefinitions = ({
  application,
}: {
  application: ApplicationStart;
}): [
  Definition<typeof ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE>,
  Definition<typeof ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE>,
  Definition<typeof ESCALATION_ATTACHMENTS_SYNCED_EVENT_TYPE, EscalationAttachmentsSyncedEventData>
] => {
  const renderLink = ({
    investigation_id: id,
    agent_id: agentId,
    title,
  }: EscalationInvestigationEventData) => (
    <InvestigationLink
      application={application}
      conversationId={id}
      agentId={agentId}
      title={title}
    />
  );

  return [
    {
      type: ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE,
      getHeader,
      render: ({ data }) => (
        <EuiText size="s" color="primary" data-test-subj="escalationCreatedFromInvestigationEvent">
          <FormattedMessage
            id="xpack.agenticInvestigations.escalations.events.createdFrom"
            defaultMessage="New escalation created from {title}"
            values={{ title: renderLink(data) }}
          />
        </EuiText>
      ),
    },
    {
      type: ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE,
      getHeader,
      render: ({ data }) => (
        <EuiText size="s" color="primary" data-test-subj="escalationInvestigationLinkedEvent">
          <FormattedMessage
            id="xpack.agenticInvestigations.escalations.events.linked"
            defaultMessage="{title} has been linked to this escalation"
            values={{ title: renderLink(data) }}
          />
        </EuiText>
      ),
    },
    {
      type: ESCALATION_ATTACHMENTS_SYNCED_EVENT_TYPE,
      getHeader,
      render: ({ data }) => (
        <EuiText size="s" color="primary" data-test-subj="escalationAttachmentsSyncedEvent">
          <FormattedMessage
            id="xpack.agenticInvestigations.escalations.events.attachmentsSynced"
            defaultMessage="{count, plural, one {# attachment was} other {# attachments were}} synced from {title}"
            values={{ count: data.attachment_ids.length, title: renderLink(data) }}
          />
        </EuiText>
      ),
    },
  ];
};

export const registerEscalationConversationEventUiDefinitions = ({
  conversationEvents,
  application,
}: {
  conversationEvents: ConversationEventsServiceStartContract;
  application: ApplicationStart;
}): void => {
  const [createdFrom, linked, attachmentsSynced] = createEscalationConversationEventUiDefinitions({
    application,
  });
  conversationEvents.register(createdFrom);
  conversationEvents.register(linked);
  conversationEvents.register(attachmentsSynced);
};
