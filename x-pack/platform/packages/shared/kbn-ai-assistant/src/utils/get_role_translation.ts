/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';

export function getRoleTranslation({
  role,
  isCurrentUser,
  username,
}: {
  role: MessageRole;
  isCurrentUser: boolean;
  username?: string;
}) {
  if (role === MessageRole.User) {
    return isCurrentUser
      ? i18n.translate('xpack.aiAssistant.chatTimeline.messages.user.label', {
          defaultMessage: 'You',
        })
      : username;
  }

  return i18n.translate('xpack.aiAssistant.chatTimeline.messages.elasticAssistant.label', {
    defaultMessage: 'Elastic Assistant',
  });
}
