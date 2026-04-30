/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const accessFlyoutTitle = i18n.translate('xpack.agentBuilder.acl.flyout.title', {
  defaultMessage: 'Manage access',
});

export const accessFlyoutContextCallout = i18n.translate(
  'xpack.agentBuilder.acl.flyout.contextCallout',
  {
    defaultMessage:
      'Visibility sets who can find and use this agent by default. Access entries grant specific people or roles additional permissions on top of that.',
  }
);

export const accessFlyoutCancel = i18n.translate('xpack.agentBuilder.acl.flyout.cancel', {
  defaultMessage: 'Cancel',
});

export const accessFlyoutSave = i18n.translate('xpack.agentBuilder.acl.flyout.save', {
  defaultMessage: 'Save changes',
});

export const accessFlyoutPeopleSection = i18n.translate(
  'xpack.agentBuilder.acl.flyout.peopleSectionTitle',
  { defaultMessage: 'People' }
);

export const accessFlyoutRolesSection = i18n.translate(
  'xpack.agentBuilder.acl.flyout.rolesSectionTitle',
  { defaultMessage: 'Roles' }
);

export const accessFlyoutAddPeoplePlaceholder = i18n.translate(
  'xpack.agentBuilder.acl.flyout.addPeoplePlaceholder',
  { defaultMessage: 'Add a user…' }
);

export const accessFlyoutAddRolesPlaceholder = i18n.translate(
  'xpack.agentBuilder.acl.flyout.addRolesPlaceholder',
  { defaultMessage: 'Add a role…' }
);

export const accessFlyoutNoPeople = i18n.translate('xpack.agentBuilder.acl.flyout.noPeople', {
  defaultMessage: 'No specific users have been granted access yet.',
});

export const accessFlyoutNoRoles = i18n.translate('xpack.agentBuilder.acl.flyout.noRoles', {
  defaultMessage: 'No specific roles have been granted access yet.',
});

export const accessFlyoutRoleAriaLabel = i18n.translate(
  'xpack.agentBuilder.acl.flyout.roleAriaLabel',
  { defaultMessage: 'Access level' }
);

export const accessFlyoutRemoveAriaLabel = i18n.translate(
  'xpack.agentBuilder.acl.flyout.removeAriaLabel',
  { defaultMessage: 'Remove access entry' }
);

export const accessFlyoutSaveError = i18n.translate('xpack.agentBuilder.acl.flyout.saveError', {
  defaultMessage: 'Could not save changes to access.',
});

export const accessFlyoutConflictError = i18n.translate(
  'xpack.agentBuilder.acl.flyout.conflictError',
  {
    defaultMessage:
      'Access was changed by someone else while you were editing. Reload to see the latest list and try again.',
  }
);

export const accessSummaryCardTitle = i18n.translate('xpack.agentBuilder.acl.summary.title', {
  defaultMessage: 'Access',
});

export const accessSummaryManageButton = i18n.translate(
  'xpack.agentBuilder.acl.summary.manageButton',
  { defaultMessage: 'Manage access' }
);

export const accessSummaryDefaultDescription = i18n.translate(
  'xpack.agentBuilder.acl.summary.defaultDescription',
  {
    defaultMessage: 'No custom access entries. Visibility controls who can use this agent.',
  }
);

export const accessSummaryHiddenDescription = i18n.translate(
  'xpack.agentBuilder.acl.summary.hiddenDescription',
  { defaultMessage: 'This agent has custom access controls.' }
);

export const accessFlyoutCustomBadge = i18n.translate(
  'xpack.agentBuilder.acl.list.customAccessTooltip',
  { defaultMessage: 'Custom access' }
);

export const accessSummaryCount = (users: number, roles: number) =>
  i18n.translate('xpack.agentBuilder.acl.summary.count', {
    defaultMessage:
      '{users, plural, one {# user} other {# users}}, {roles, plural, one {# role} other {# roles}}',
    values: { users, roles },
  });

export const accessFlyoutVisibilityLabel = (visibility: string) =>
  i18n.translate('xpack.agentBuilder.acl.flyout.currentVisibilityLabel', {
    defaultMessage: 'Current visibility: {visibility}',
    values: { visibility },
  });

export const accessFlyoutMissingPrincipal = i18n.translate(
  'xpack.agentBuilder.acl.flyout.missingPrincipal',
  { defaultMessage: 'No longer exists' }
);
