/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { OnechatAgents } from '../components/agents/list/agents';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { appPaths } from '../utils/app_paths';
import { labels } from '../utils/i18n';

export const OnechatAgentsPage = () => {
  useBreadcrumb([
    {
      text: labels.chat.title,
      path: appPaths.root,
    },
    {
      text: labels.agents.title,
      path: appPaths.agents.list,
    },
  ]);
  return <OnechatAgents />;
};
