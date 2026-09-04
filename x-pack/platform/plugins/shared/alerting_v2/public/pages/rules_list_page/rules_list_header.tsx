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
import { triggersActionsRoute } from '@kbn/rule-data-utils';
import { experimentalBadge } from '../../components/experimental_badge';
import { paths } from '../../constants';
import { canReadV1Rules } from '../../utils/can_read_v1_rules';

const RULES_LIST_PAGE_TITLE = i18n.translate('xpack.alertingV2.rulesList.pageTitle', {
  defaultMessage: 'Rules',
});

const getRulesListMenu = ({
  onCreateRule,
  onCreateEsqlRule,
  onCreateWithAgent,
  onBuildSequence,
  createWithAgentDisabled,
  createWithAgentTooltipText,
}: {
  onCreateRule: () => void;
  onCreateEsqlRule: () => void;
  onCreateWithAgent: () => void;
  onBuildSequence: () => void;
  createWithAgentDisabled?: boolean;
  createWithAgentTooltipText?: string;
}): AppHeaderMenu => ({
  items: [
    {
      id: 'buildSequence',
      label: i18n.translate('xpack.alertingV2.rulesList.buildSequenceButton', {
        defaultMessage: 'Build a sequence',
      }),
      iconType: 'branch',
      tooltipContent: i18n.translate('xpack.alertingV2.rulesList.buildSequenceTooltip', {
        defaultMessage: 'Chain rules to detect multi-step alert patterns',
      }),
      testId: 'createSequenceRuleButton',
      run: onBuildSequence,
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
    popoverTestId: 'createRulePopoverPanel',
    splitButtonProps: {
      iconType: 'chevronSingleDown',
      secondaryButtonAriaLabel: i18n.translate('xpack.alertingV2.rulesList.createRuleMoreOptions', {
        defaultMessage: 'More create options',
      }),
      items: [
        {
          id: 'createEsqlRule',
          label: i18n.translate('xpack.alertingV2.rulesList.createEsqlRuleButton', {
            defaultMessage: 'Create ES|QL rule',
          }),
          iconType: 'productDiscover',
          order: 0,
          run: onCreateEsqlRule,
          testId: 'createEsqlRuleButton',
        },
        {
          id: 'createWithAgent',
          label: i18n.translate('xpack.alertingV2.rulesList.createWithAgentButton', {
            defaultMessage: 'Create with agent',
          }),
          iconType: 'sparkles' as const,
          order: 1,
          run: onCreateWithAgent,
          testId: 'createWithAgentButton',
          disableButton: createWithAgentDisabled,
          tooltipContent: createWithAgentTooltipText,
        },
      ],
    },
  },
});

export interface RulesListHeaderProps {
  canWrite: boolean;
  onCreateRule: () => void;
  onCreateEsqlRule: () => void;
  onCreateWithAgent: () => void;
  onBuildSequence: () => void;
  createWithAgentDisabled?: boolean;
  createWithAgentTooltipText?: string;
}

/**
 * App header that reads Content List phase so the create menu stays hidden
 * during the true empty state (create options live in that empty state).
 * Must render under {@link ContentListProvider}.
 */
export const RulesListHeader = ({
  canWrite,
  onCreateRule,
  onCreateEsqlRule,
  onCreateWithAgent,
  onBuildSequence,
  createWithAgentDisabled,
  createWithAgentTooltipText,
}: RulesListHeaderProps) => {
  const phase = useContentListPhase();
  const showHeaderMenu = canWrite && phase !== 'empty' && phase !== 'initialLoad';

  const application = useService(CoreStart('application'));
  const basePath = useService(CoreStart('http')).basePath;

  const tabs = useMemo<AppHeaderTab[]>(() => {
    const headerTabs: AppHeaderTab[] = [
      {
        id: 'v2Rules',
        label: i18n.translate('xpack.alertingV2.rulesList.v2RulesTabTitle', {
          defaultMessage: 'V2 rules',
        }),
        isSelected: true,
        href: basePath.prepend(paths.ruleList),
        badge: {
          iconType: 'sparkles',
          tooltip: i18n.translate('xpack.alertingV2.rulesList.v2RulesTabNewBadgeTooltip', {
            defaultMessage: 'New',
          }),
        },
        'data-test-subj': 'v2RulesTab',
      },
    ];

    // Keeps the tab from pointing at a privileges wall.
    if (canReadV1Rules(application.capabilities)) {
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

  const headerMenu = useMemo(
    () =>
      showHeaderMenu
        ? getRulesListMenu({
            onCreateRule,
            onCreateEsqlRule,
            onCreateWithAgent,
            onBuildSequence,
            createWithAgentDisabled,
            createWithAgentTooltipText,
          })
        : undefined,
    [
      showHeaderMenu,
      onCreateRule,
      onCreateEsqlRule,
      onCreateWithAgent,
      onBuildSequence,
      createWithAgentDisabled,
      createWithAgentTooltipText,
    ]
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
