/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const thinkingLabel = i18n.translate('xpack.agentBuilder.round.thinking', {
  defaultMessage: 'Thinking...',
});

const agentLabel = i18n.translate('xpack.agentBuilder.round.agent', {
  defaultMessage: 'Agent',
});

interface Props {
  isStreaming: boolean;
}

export const RoundEventsHeader: React.FC<Props> = ({ isStreaming }) => (
  <EuiText size="s" color="subdued">
    <p>{isStreaming ? thinkingLabel : agentLabel}</p>
  </EuiText>
);
