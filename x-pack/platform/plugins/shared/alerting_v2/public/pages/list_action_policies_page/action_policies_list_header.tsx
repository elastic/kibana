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

const ACTION_POLICIES_LIST_PAGE_TITLE = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.pageTitle',
  { defaultMessage: 'Action Policies' }
);

const getActionPoliciesListMenu = ({
  onCreatePolicy,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
}: {
  onCreatePolicy: () => void;
  onCreateWithAgent: () => void;
  createWithAgentDisabled?: boolean;
  createWithAgentTooltipText?: string;
}): AppHeaderMenu => ({
  primaryActionItem: {
    id: 'createActionPolicy',
    label: i18n.translate('xpack.alertingV2.actionPoliciesList.createPolicyButton', {
      defaultMessage: 'Create policy',
    }),
    iconType: 'plusCircle',
    run: onCreatePolicy,
    testId: 'createActionPolicyButton',
    popoverTestId: 'createActionPolicyPopoverPanel',
    splitButtonProps: {
      iconType: 'arrowDown',
      secondaryButtonAriaLabel: i18n.translate(
        'xpack.alertingV2.actionPoliciesList.createPolicyMoreOptions',
        { defaultMessage: 'More create options' }
      ),
      items: [
        {
          id: 'createWithAgent',
          label: i18n.translate('xpack.alertingV2.actionPoliciesList.createWithAgentButton', {
            defaultMessage: 'Create with agent',
          }),
          iconType: 'sparkles' as const,
          order: 0,
          run: onCreateWithAgent,
          testId: 'createActionPolicyWithAgentButton',
          disableButton: createWithAgentDisabled,
          tooltipContent: createWithAgentTooltipText,
        },
      ],
    },
  },
});

export interface ActionPoliciesListHeaderProps {
  canWrite: boolean;
  onCreatePolicy: () => void;
  onCreateWithAgent: () => void;
  createWithAgentDisabled?: boolean;
  createWithAgentTooltipText?: string;
}

/**
 * App header that reads Content List phase so the create menu stays hidden
 * during the true empty state (create options live in that empty state).
 * Must render under {@link ContentListProvider}.
 */
export const ActionPoliciesListHeader = ({
  canWrite,
  onCreatePolicy,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
}: ActionPoliciesListHeaderProps) => {
  const phase = useContentListPhase();
  const showHeaderMenu = canWrite && phase !== 'empty' && phase !== 'initialLoad';

  const headerMenu = useMemo(
    () =>
      showHeaderMenu
        ? getActionPoliciesListMenu({
            onCreatePolicy,
            onCreateWithAgent,
            createWithAgentDisabled,
            createWithAgentTooltipText,
          })
        : undefined,
    [
      showHeaderMenu,
      onCreatePolicy,
      onCreateWithAgent,
      createWithAgentDisabled,
      createWithAgentTooltipText,
    ]
  );

  return (
    <>
      <AppHeader
        sticky={false}
        title={ACTION_POLICIES_LIST_PAGE_TITLE}
        badges={[experimentalBadge]}
        spacing="bleed"
        menu={headerMenu}
      />
      <EuiSpacer size="m" />
    </>
  );
};
