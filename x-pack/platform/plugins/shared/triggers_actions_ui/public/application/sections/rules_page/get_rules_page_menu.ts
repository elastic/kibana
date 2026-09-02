/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

export const getRulesPageMenu = ({
  authorizedToCreateAnyRules,
  canShowSettings,
  extraItems = [],
  onCreateRule,
  onOpenSettings,
}: {
  authorizedToCreateAnyRules: boolean;
  canShowSettings: boolean;
  extraItems?: NonNullable<AppMenuConfig['items']>;
  onCreateRule?: () => void;
  onOpenSettings: () => void;
}): AppMenuConfig => {
  const primaryActionItem =
    authorizedToCreateAnyRules && onCreateRule
      ? {
          id: 'createRule',
          label: i18n.translate('xpack.triggersActionsUI.rules.addRuleButtonLabel', {
            defaultMessage: 'Create rule',
          }),
          iconType: 'plusCircle',
          run: onCreateRule,
          testId: 'createRuleButton',
        }
      : undefined;

  return {
    primaryActionItem,
    items: [
      ...(canShowSettings
        ? [
            {
              id: 'rulesSettings',
              order: 100,
              label: i18n.translate('xpack.triggersActionsUI.rulesSettings.link.title', {
                defaultMessage: 'Settings',
              }),
              iconType: 'gear',
              run: onOpenSettings,
              testId: 'rulesSettingsLink',
            },
          ]
        : []),
      ...extraItems,
    ],
  };
};
