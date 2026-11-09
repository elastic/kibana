/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const labels = {
  newChat: i18n.translate('xpack.agentBuilder.conversationAppHeader.newChat', {
    defaultMessage: 'New chat',
  }),
  editTitle: i18n.translate('xpack.agentBuilder.conversationAppHeader.editTitle', {
    defaultMessage: 'Edit chat title',
  }),
  renameError: i18n.translate('xpack.agentBuilder.conversationAppHeader.renameError', {
    defaultMessage: 'Failed to rename chat',
  }),
  readOnly: i18n.translate('xpack.agentBuilder.conversationAppHeader.readOnly', {
    defaultMessage: 'Read-only',
  }),
  share: i18n.translate('xpack.agentBuilder.conversationAppHeader.share', {
    defaultMessage: 'Share',
  }),
  summary: i18n.translate('xpack.agentBuilder.conversationAppHeader.summary', {
    defaultMessage: 'Summary',
  }),
  chatDetails: i18n.translate('xpack.agentBuilder.conversationAppHeader.chatDetails', {
    defaultMessage: 'Chat details',
  }),
  activityLog: i18n.translate('xpack.agentBuilder.conversationAppHeader.activityLog', {
    defaultMessage: 'Activity log',
  }),
  activityLogNoActivity: i18n.translate(
    'xpack.agentBuilder.conversationAppHeader.activityLogNoActivity',
    {
      defaultMessage: 'No activity has been recorded for this chat.',
    }
  ),
  downloadChat: i18n.translate('xpack.agentBuilder.conversationAppHeader.downloadChat', {
    defaultMessage: 'Download chat',
  }),
  delete: i18n.translate('xpack.agentBuilder.conversationAppHeader.delete', {
    defaultMessage: 'Delete',
  }),
};
