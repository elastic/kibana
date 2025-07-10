/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const labels = {
  chat: { title: i18n.translate('xpack.onechat.root.title', { defaultMessage: 'Chat' }) },
  agents: {
    title: i18n.translate('xpack.onechat.agents.list.title', { defaultMessage: 'Agents' }),
    newAgent: i18n.translate('xpack.onechat.agents.new.title', { defaultMessage: 'New Agent' }),
    editAgent: i18n.translate('xpack.onechat.agents.edit.title', { defaultMessage: 'Edit Agent' }),
    createAgent: i18n.translate('xpack.onechat.agents.create.title', {
      defaultMessage: 'Create Agent',
    }),
  },
};
