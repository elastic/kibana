/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const shareLabel = i18n.translate('xpack.agentBuilder.conversationSharing.share', {
  defaultMessage: 'Share',
});

export const shareThisChatLabel = i18n.translate(
  'xpack.agentBuilder.conversationSharing.shareThisChat',
  {
    defaultMessage: 'Share this chat',
  }
);

export const participantsLabel = i18n.translate(
  'xpack.agentBuilder.conversationSharing.participantsTitle',
  {
    defaultMessage: 'Participants',
  }
);

export const closeLabel = i18n.translate('xpack.agentBuilder.conversationSharing.close', {
  defaultMessage: 'Close sharing',
});

export const generalAccessLabel = i18n.translate(
  'xpack.agentBuilder.conversationSharing.generalAccess',
  {
    defaultMessage: 'General access',
  }
);

export const restrictedLabel = i18n.translate('xpack.agentBuilder.conversationSharing.restricted', {
  defaultMessage: 'Restricted',
});

export const publicLabel = i18n.translate('xpack.agentBuilder.conversationSharing.public', {
  defaultMessage: 'Public',
});

export const restrictedHelpLabel = i18n.translate(
  'xpack.agentBuilder.conversationSharing.restrictedHelp',
  {
    defaultMessage: 'Only manually added members can see this chat',
  }
);

export const publicHelpLabel = i18n.translate('xpack.agentBuilder.conversationSharing.publicHelp', {
  defaultMessage: 'Any user can see and join this chat',
});

export const inviteUsersLabel = i18n.translate(
  'xpack.agentBuilder.conversationSharing.inviteUsers',
  {
    defaultMessage: 'Invite users',
  }
);

export const addUsersLabel = i18n.translate('xpack.agentBuilder.conversationSharing.addUsers', {
  defaultMessage: 'Add users',
});

export const usersSectionTitle = (count: number) =>
  i18n.translate('xpack.agentBuilder.conversationSharing.usersSectionTitle', {
    defaultMessage: 'In this chat ({count})',
    values: { count },
  });

export const agentAccessHelpLabel = (agentName: string) =>
  i18n.translate('xpack.agentBuilder.conversationSharing.agentAccessHelp', {
    defaultMessage:
      'Search results display all users, but only users with access to {agentName} can see this chat.',
    values: { agentName },
  });

export const searchUsersLabel = i18n.translate(
  'xpack.agentBuilder.conversationSharing.searchUsers',
  {
    defaultMessage: 'Search for users to add',
  }
);

export const authorLabel = i18n.translate('xpack.agentBuilder.conversationSharing.author', {
  defaultMessage: 'Author',
});

export const removeMemberLabel = i18n.translate(
  'xpack.agentBuilder.conversationSharing.removeMember',
  {
    defaultMessage: 'Remove member',
  }
);

export const saveErrorLabel = i18n.translate('xpack.agentBuilder.conversationSharing.saveError', {
  defaultMessage: 'Failed to update sharing settings',
});
