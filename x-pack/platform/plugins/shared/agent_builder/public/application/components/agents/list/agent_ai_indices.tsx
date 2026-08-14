/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBadgeGroup, EuiToolTip } from '@elastic/eui';
import { labels } from '../../../utils/i18n';

const NUM_VISIBLE_AI_INDICES = 2;

/**
 * The AI indices an agent retrieves from, as read-only badges for the agents table. Assigned and
 * inherited ones are not told apart here — editing happens on the agent's AI indices tab.
 */
export const AgentAiIndices: React.FC<{ aiIndices: string[]; numVisible?: number }> = ({
  aiIndices,
  numVisible = NUM_VISIBLE_AI_INDICES,
}) => {
  if (aiIndices.length === 0) {
    return null;
  }

  const visible = aiIndices.slice(0, numVisible);
  const hidden = aiIndices.slice(numVisible);

  return (
    <EuiBadgeGroup
      gutterSize="s"
      role="list"
      aria-label={labels.aiIndices.columnTitle}
      data-test-subj="agentBuilderAgentAiIndices"
    >
      {visible.map((aiIndex) => (
        <EuiBadge
          key={aiIndex}
          color="hollow"
          role="listitem"
          data-test-subj={`agentBuilderAgentAiIndex-${aiIndex}`}
        >
          {aiIndex}
        </EuiBadge>
      ))}
      {hidden.length > 0 && (
        <EuiToolTip content={hidden.join(', ')}>
          {/* Focusable so the overflow is reachable without a pointer; the badge itself does nothing. */}
          <EuiBadge
            color="hollow"
            tabIndex={0}
            data-test-subj="agentBuilderAgentAiIndicesHiddenCount"
          >
            {labels.aiIndices.hiddenCountBadge(hidden.length)}
          </EuiBadge>
        </EuiToolTip>
      )}
    </EuiBadgeGroup>
  );
};
