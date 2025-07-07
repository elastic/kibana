/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<< HEAD
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
=======
import { i18n } from '@kbn/i18n';
import React from 'react';
import { OnechatAgents } from '../components/agents/agents';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';

export const OnechatAgentsPage = () => {
  useBreadcrumb([
    { text: i18n.translate('xpack.onechat.chat.title', { defaultMessage: 'Chat' }) },
    { text: i18n.translate('xpack.onechat.agents.title', { defaultMessage: 'Agents' }) },
>>>>>>> main
  ]);
  return <OnechatAgents />;
};
