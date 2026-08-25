/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { AgentAiIndicesWarning } from '../../../../../common/http_api/agents';
import { labels } from '../../../utils/i18n';

interface AiIndicesWarningsPanelProps {
  warnings: AgentAiIndicesWarning[];
  'data-test-subj'?: string;
}

export const AiIndicesWarningsPanel: React.FC<AiIndicesWarningsPanelProps> = ({
  warnings,
  'data-test-subj': dataTestSubj = 'agentBuilderAiIndicesWarnings',
}) => {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <KbnWarningCallout
      announceOnMount
      size="s"
      title={labels.aiIndices.warningsTitle}
      data-test-subj={dataTestSubj}
    >
      {warnings.map(({ message, agent_type: agentType }) => (
        <div key={`${agentType ?? ''}:${message}`}>
          {labels.aiIndices.warningMessage({ message, agentType })}
        </div>
      ))}
    </KbnWarningCallout>
  );
};
