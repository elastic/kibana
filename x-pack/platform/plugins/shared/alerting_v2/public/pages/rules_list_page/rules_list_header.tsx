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
import { experimentalBadge } from '../../components/experimental_badge';
import { paths } from '../../constants';

const RULES_LIST_PAGE_TITLE = i18n.translate('xpack.alertingV2.rulesList.pageTitle', {
  defaultMessage: 'Rules',
});

const getRulesListMenu = ({ onCreateRule }: { onCreateRule: () => void }): AppHeaderMenu => ({
  items: [],
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
}

/**
 * App header that reads Content List phase so the create menu stays hidden
 * during the true empty state (create options live in that empty state).
 * Must render under {@link ContentListProvider}.
 */
export const RulesListHeader = ({ canWrite, onCreateRule }: RulesListHeaderProps) => {
  const phase = useContentListPhase();
  const showHeaderMenu = canWrite && phase !== 'empty' && phase !== 'initialLoad';

  const application = useService(CoreStart('application'));
  const basePath = useService(CoreStart('http')).basePath;
  const hostTabs = useHostTabs();

  const defaultTabs = useMemo<AppHeaderTab[]>(() => {
    const headerTabs: AppHeaderTab[] = [
      {
        id: 'v2Rules',
        label: i18n.translate('xpack.alertingV2.rulesList.v2RulesTabTitle', {
          defaultMessage: 'V2 rules',
        }),
        isSelected: true,
        href: basePath.prepend(paths.ruleList),
        badge: {
          iconType: 'dot',
          tooltip: i18n.translate('xpack.alertingV2.rulesList.v2RulesTabNewBadgeTooltip', {
            defaultMessage: 'New',
          }),
        },
        'data-test-subj': 'v2RulesTab',
      },
    ];

    if (canAccessTriggersActionsRules(application.capabilities)) {
      headerTabs.push({
        id: 'v1Rules',
        label: i18n.translate('xpack.alertingV2.rulesList.v1RulesTabTitle', {
          defaultMessage: 'V1 rules',
        }),
        isSelected: false,
        href: basePath.prepend(triggersActionsRoute),
        'data-test-subj': 'v1RulesTab',
      });
    }

    // A one-item tablist is not a tablist — omit tabs unless both surfaces are shown.
    return headerTabs.length > 1 ? headerTabs : [];
  }, [basePath, application.capabilities]);

  const tabs = hostTabs ?? defaultTabs;

  const headerMenu = useMemo(
    () => (showHeaderMenu ? getRulesListMenu({ onCreateRule }) : undefined),
    [showHeaderMenu, onCreateRule]
  );

  return (
    <>
      <AppHeader
        sticky={false}
        title={RULES_LIST_PAGE_TITLE}
        tabs={tabs}
        badges={[experimentalBadge]}
        spacing="bleed"
        menu={headerMenu}
      />
      <EuiSpacer size="m" />
    </>
  );
};
