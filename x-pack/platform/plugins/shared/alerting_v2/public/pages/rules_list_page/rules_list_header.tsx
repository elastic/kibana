/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { useContentListPhase } from '@kbn/content-list-provider';
import { i18n } from '@kbn/i18n';
import { canAccessTriggersActionsRules, triggersActionsRoute } from '@kbn/rule-data-utils';
import { useHostTabs } from '../../application/tabs_context';
import { paths } from '../../constants';

const RULES_LIST_PAGE_TITLE = i18n.translate('xpack.alertingV2.rulesList.pageTitle', {
  defaultMessage: 'Rules',
});

const getRulesListMenu = ({
  onCreateRule,
  onHelpMeOnboard,
}: {
  onCreateRule: () => void;
  onHelpMeOnboard: () => void;
}): AppHeaderMenu => ({
  items: [
    {
      id: 'getStarted',
      order: 0,
      label: i18n.translate('xpack.alertingV2.rulesList.getStartedButton', {
        defaultMessage: 'Get started',
      }),
      iconType: 'rocket',
      run: onHelpMeOnboard,
      testId: 'rulesListHeaderGetStartedButton',
      // Keep Create rule primary in the header; tuck onboarding under More.
      overflow: true,
    },
  ],
  primaryActionItem: {
    id: 'createRule',
    label: i18n.translate('xpack.alertingV2.rulesList.createRuleButton', {
      defaultMessage: 'Create rule',
    }),
    iconType: 'plusCircle',
    run: onCreateRule,
    testId: 'createRuleButton',
  },
});

export interface RulesListHeaderProps {
  canWrite: boolean;
  onCreateRule: () => void;
  onHelpMeOnboard: () => void;
}

/**
 * App header for the Universal rules list. Create opens the host create flow
 * (mixed chooser in Observability Alerting, or create-options flyout elsewhere).
 * Get started opens the same onboarding modal as the empty-state CTA.
 * Hidden during the empty state so create options live only in that prompt.
 * Must render under {@link ContentListProvider}.
 */
export const RulesListHeader = ({
  canWrite,
  onCreateRule,
  onHelpMeOnboard,
}: RulesListHeaderProps) => {
  const phase = useContentListPhase();
  const showHeaderMenu = canWrite && phase !== 'empty' && phase !== 'initialLoad';
  const application = useService(CoreStart('application'));
  const basePath = useService(CoreStart('http')).basePath;
  const hostTabs = useHostTabs();

  const defaultTabs = useMemo<AppHeaderTab[]>(() => {
    if (!canAccessTriggersActionsRules(application.capabilities)) {
      // A one-item tablist is not a tablist — omit tabs unless both surfaces are shown.
      return [];
    }

    return [
      {
        id: 'v2Rules',
        label: i18n.translate('xpack.alertingV2.rulesList.v2RulesTabTitle', {
          defaultMessage: 'Universal',
        }),
        isSelected: true,
        href: basePath.prepend(paths.ruleList),
        badge: {
          iconType: 'dot',
          color: 'primary',
          tooltip: i18n.translate('xpack.alertingV2.rulesList.v2RulesTabNewBadgeTooltip', {
            defaultMessage: 'New',
          }),
        },
        'data-test-subj': 'v2RulesTab',
      },
      {
        id: 'v1Rules',
        label: i18n.translate('xpack.alertingV2.rulesList.v1RulesTabTitle', {
          defaultMessage: 'Classic',
        }),
        isSelected: false,
        href: basePath.prepend(triggersActionsRoute),
        'data-test-subj': 'v1RulesTab',
      },
    ];
  }, [basePath, application.capabilities]);

  const tabs = hostTabs ?? defaultTabs;

  const headerMenu = useMemo(
    () => (showHeaderMenu ? getRulesListMenu({ onCreateRule, onHelpMeOnboard }) : undefined),
    [showHeaderMenu, onCreateRule, onHelpMeOnboard]
  );

  return (
    <>
      <AppHeader
        sticky={false}
        title={RULES_LIST_PAGE_TITLE}
        tabs={tabs}
        spacing="bleed"
        menu={headerMenu}
      />
      <EuiSpacer size="m" />
    </>
  );
};
