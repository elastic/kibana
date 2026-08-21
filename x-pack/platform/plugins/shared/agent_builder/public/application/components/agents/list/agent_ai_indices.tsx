/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BadgeList } from '../../common/badge_list';
import { labels } from '../../../utils/i18n';

/**
 * The AI indices an agent retrieves from, as read-only badges for the agents table. Assigned and
 * inherited ones are not told apart here — editing happens in the agent's AI indices section.
 */
export const AgentAiIndices: React.FC<{ aiIndices: string[] }> = ({ aiIndices }) => (
  <BadgeList
    items={aiIndices}
    numVisible={2}
    ariaLabel={labels.aiIndices.columnTitle}
    testSubjPrefix="agentBuilderAgentAiIndex"
    data-test-subj="agentBuilderAgentAiIndices"
  />
);
