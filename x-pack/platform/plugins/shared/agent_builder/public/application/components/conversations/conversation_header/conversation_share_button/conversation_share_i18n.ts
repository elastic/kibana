/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const inviteLabel = i18n.translate('xpack.agentBuilder.conversationSharing.invite', {
  defaultMessage: 'Invite',
});

export const sharingLabel = i18n.translate('xpack.agentBuilder.conversationSharing.title', {
  defaultMessage: 'Sharing',
});

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

export const currentMembersLabel = i18n.translate(
  'xpack.agentBuilder.conversationSharing.currentMembers',
  {
    defaultMessage: 'Current members',
  }
);

export const agentAccessHelpLabel = (agentName: string) =>
  i18n.translate('xpack.agentBuilder.conversationSharing.agentAccessHelp', {
    defaultMessage:
      'User search results include everyone, even users without access to the {agentName} agent. Only members with access to it can see this chat.',
    values: { agentName },
  });

export const agentAccessHelpAriaLabel = i18n.translate(
  'xpack.agentBuilder.conversationSharing.agentAccessHelpAriaLabel',
  {
    defaultMessage: 'Agent access information',
  }
);

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

export const extraMembersLabel = (count: number) =>
  i18n.translate('xpack.agentBuilder.conversationSharing.extraMembersLabel', {
    defaultMessage: '{count, plural, one {# more member} other {# more members}}',
    values: { count },
  });

export const saveErrorLabel = i18n.translate('xpack.agentBuilder.conversationSharing.saveError', {
  defaultMessage: 'Failed to update sharing settings',
});
