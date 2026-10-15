/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EventVia as EventViaData } from '../../common/conversation_events/via';

/** People get the user icon; automation gets the icon of what ran. */
export const getViaIcon = (via?: EventViaData) => {
  if (via?.type === 'workflow') return 'workflow';
  if (via?.type === 'agent') return 'productAgent';
  return 'user';
};

/** Names the automation behind an event. Renders nothing for a direct user action. */
export const EventVia = ({ via }: { via?: EventViaData }) => {
  if (!via) return null;

  return (
    <EuiText size="xs" color="subdued" data-test-subj="conversationEventVia">
      {via.type === 'workflow' ? (
        <FormattedMessage
          id="xpack.agenticInvestigations.conversationEvents.viaWorkflow"
          defaultMessage="via workflow {name}"
          values={{ name: <strong>{via.workflow_name || via.workflow_id}</strong> }}
        />
      ) : via.agent_name ? (
        <FormattedMessage
          id="xpack.agenticInvestigations.conversationEvents.viaNamedAgent"
          defaultMessage="via agent {name}"
          values={{ name: <strong>{via.agent_name}</strong> }}
        />
      ) : (
        <FormattedMessage
          id="xpack.agenticInvestigations.conversationEvents.viaAgent"
          defaultMessage="via the agent"
        />
      )}
    </EuiText>
  );
};
