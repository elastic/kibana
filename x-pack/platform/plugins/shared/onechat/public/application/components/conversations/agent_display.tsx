/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiText } from '@elastic/eui';
import type { AgentDefinition } from '@kbn/onechat-common';

interface AgentDisplayProps {
  currentAgent?: AgentDefinition | null;
  isLoading?: boolean;
}

export const AgentDisplay: React.FC<AgentDisplayProps> = ({ currentAgent, isLoading }) => {
  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  return (
    <EuiText color="subdued" size="s">
      {currentAgent?.name}
    </EuiText>
  );
};
