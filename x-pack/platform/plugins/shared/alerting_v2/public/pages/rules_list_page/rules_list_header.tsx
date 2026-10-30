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
import { ALERTING_V2_RULES_TAB_ID } from '@kbn/alerting-v2-constants';
import { useHostTabs } from '../../application/tabs_context';
import { paths } from '../../constants';
import {
  useAreAgentBuilderSkillsAvailable,
  useAgentBuilderSkillsRequirements,
} from '../../hooks/use_are_agent_builder_skills_available';
import { useV2RulesTabNewBadge } from '../../hooks/use_v2_rules_tab_new_badge';
import { getCreateWithAgentTooltipText } from '../../components/rule_create_options/rule_create_options_panel';

const RULES_LIST_PAGE_TITLE = i18n.translate('xpack.alertingV2.rulesList.pageTitle', {
  defaultMessage: 'Rules',
});

const getRulesListMenu = ({
  onCreateRule,
  onCreateEsqlRule,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
}: {
  onCreateRule: () => void;
  onCreateEsqlRule: () => void;
  onCreateWithAgent: () => void;
  createWithAgentDisabled?: boolean;
  createWithAgentTooltipText?: string;
}): AppHeaderMenu => ({
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
}: RulesListHeaderProps) => {
  const phase = useContentListPhase();
  const showHeaderMenu = canWrite && phase !== 'empty' && phase !== 'initialLoad';

  const application = useService(CoreStart('application'));
  const basePath = useService(CoreStart('http')).basePath;
  const { links } = useService(CoreStart('docLinks'));
  const hostTabs = useHostTabs();
  const createWithAgentDisabled = !useAreAgentBuilderSkillsAvailable();
  const createWithAgentTooltipText = getCreateWithAgentTooltipText(
    useAgentBuilderSkillsRequirements()
  );

  // When host tabs are provided they own the badge; Management defaults treat Universal as selected.
  // Do not persist on unmount here — this header unmounts for rule details while still in Universal.
  // App-leave persist lives on RulesApp / Observability shell (`persistOnUnmount: true`).
  const isUniversalSelected =
    hostTabs?.find((tab) => tab.id === ALERTING_V2_RULES_TAB_ID)?.isSelected ?? true;
  const v2RulesTabNewBadge = useV2RulesTabNewBadge(isUniversalSelected, {
    persistOnUnmount: false,
  });

  const defaultTabs = useMemo<AppHeaderTab[]>(() => {
    const headerTabs: AppHeaderTab[] = [
      {
        id: ALERTING_V2_RULES_TAB_ID,
        label: i18n.translate('xpack.alertingV2.rulesList.v2RulesTabTitle', {
          defaultMessage: 'Universal',
        }),
        isSelected: true,
        href: basePath.prepend(paths.ruleList),
        ...(v2RulesTabNewBadge !== undefined ? { badge: v2RulesTabNewBadge } : {}),
        'data-test-subj': 'v2RulesTab',
      },
    ];

    if (canAccessTriggersActionsRules(application.capabilities)) {
      headerTabs.push({
        id: 'v1Rules',
        label: i18n.translate('xpack.alertingV2.rulesList.v1RulesTabTitle', {
          defaultMessage: 'Classic',
        }),
        isSelected: false,
        href: basePath.prepend(triggersActionsRoute),
        'data-test-subj': 'v1RulesTab',
      });
    }

    // A one-item tablist is not a tablist — omit tabs unless both surfaces are shown.
    return headerTabs.length > 1 ? headerTabs : [];
  }, [basePath, application.capabilities, v2RulesTabNewBadge]);

  const tabs = hostTabs ?? defaultTabs;

  const headerMenu = useMemo(
    () =>
      showHeaderMenu
        ? getRulesListMenu({
            onCreateRule,
            onCreateEsqlRule,
            onCreateWithAgent,
            createWithAgentDisabled,
            createWithAgentTooltipText,
          })
        : undefined,
    [
      showHeaderMenu,
      onCreateRule,
      onCreateEsqlRule,
      onCreateWithAgent,
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
        spacing="bleed"
        menu={headerMenu}
        docLink={links.alerting.viewManageRules}
      />
      <EuiSpacer size="m" />
    </>
  );
};
