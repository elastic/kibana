/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';
import { EditAgent } from '../components/agents/edit/edit_agent';

export const OnechatAgentsEdit = () => {
  const { agentId } = useParams<{ agentId: string }>();
  useBreadcrumb([
    {
      text: labels.agents.title,
      path: appPaths.agents.list,
    },
    {
      text: agentId,
    },
  ]);
  return <EditAgent agentId={agentId} />;
};
