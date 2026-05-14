/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common/telemetry';
import { Labels } from '../../common/labels';

interface AgentBuilderToolTagsProps {
  tags: string[];
}

export const AgentBuilderToolTags: React.FC<AgentBuilderToolTagsProps> = ({ tags }) => {
  return (
    <Labels
      labels={tags}
      viewMoreEbtElement={AGENT_BUILDER_UI_EBT.element.MANAGE_TOOLS_FORM}
      viewMoreEbtAction={AGENT_BUILDER_UI_EBT.action.manageTools.TABLE_LABELS_VIEW_MORE}
    />
  );
};
