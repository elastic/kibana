/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { useContentListPhase } from '@kbn/content-list-provider';
import { i18n } from '@kbn/i18n';
import { experimentalBadge } from '../../components/experimental_badge';

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
    iconType: 'plusInCircle',
    run: onCreateRule,
    testId: 'createRuleButton',
    popoverTestId: 'createRulePopoverPanel',
    splitButtonProps: {
      iconType: 'arrowDown',
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
  createWithAgentDisabled,
  createWithAgentTooltipText,
}: RulesListHeaderProps) => {
  const phase = useContentListPhase();
  const showHeaderMenu = canWrite && phase !== 'empty' && phase !== 'initialLoad';

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
        badges={[experimentalBadge]}
        spacing="bleed"
        menu={headerMenu}
      />
      <EuiSpacer size="m" />
    </>
  );
};
