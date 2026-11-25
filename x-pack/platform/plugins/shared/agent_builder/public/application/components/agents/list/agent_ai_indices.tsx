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
 * The AI indices as read-only badges for the agents table.
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
