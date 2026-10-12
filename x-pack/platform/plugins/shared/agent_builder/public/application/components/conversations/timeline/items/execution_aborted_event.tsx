/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ExecutionAbortedEvent as ExecutionAbortedEventData } from '@kbn/agent-builder-common';

interface ExecutionAbortedEventProps {
  event: ExecutionAbortedEventData;
}

/** Renders a muted indicator when a run was stopped before it completed. */
export const ExecutionAbortedEvent: React.FC<ExecutionAbortedEventProps> = ({ event }) => {
  const { aborted_by: abortedBy } = event.data;

  const label = abortedBy?.actor?.username ?? abortedBy?.actor?.id;

  return (
    <EuiText color="subdued" size="s">
      {label
        ? i18n.translate('xpack.agentBuilder.conversation.timeline.executionAborted.stoppedBy', {
            defaultMessage: 'Response stopped by {actor}',
            values: { actor: label },
          })
        : i18n.translate('xpack.agentBuilder.conversation.timeline.executionAborted.stopped', {
            defaultMessage: 'Response stopped',
          })}
    </EuiText>
  );
};
