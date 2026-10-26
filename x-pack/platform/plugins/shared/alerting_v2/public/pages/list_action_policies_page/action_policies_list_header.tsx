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
import { CoreStart, useService } from '@kbn/core-di-browser';
import { useContentListPhase } from '@kbn/content-list-provider';
import { ALERTING_V2_ACTION_POLICIES_APP_ID } from '@kbn/alerting-v2-constants';
import { i18n } from '@kbn/i18n';
import {
  UniversalRulesOnlyCallout,
  universalRulesOnlyBadge,
} from '../../components/universal_rules_only_notice';
import {
  useAreAgentBuilderSkillsAvailable,
  useAgentBuilderSkillsRequirements,
} from '../../hooks/use_are_agent_builder_skills_available';
import { useIsActionPoliciesLicenseValid } from '../../hooks/use_is_action_policies_license_valid';
import { getCreateActionPolicyWithAgentTooltipText } from '../../components/action_policy/create_options/action_policy_create_options_panel';
import { ActionPoliciesLicenseCallout } from '../../components/action_policy/action_policies_license_callout';
import { ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE } from '../../components/action_policy/labels';

const ACTION_POLICIES_LIST_PAGE_TITLE = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.pageTitle',
  { defaultMessage: 'Action Policies' }
);

const getActionPoliciesListMenu = ({
  onCreatePolicy,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
  isLicenseValid,
}: {
  onCreatePolicy: () => void;
  onCreateWithAgent: () => void;
  createWithAgentDisabled?: boolean;
  createWithAgentTooltipText?: string;
  isLicenseValid: boolean;
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
    disableButton: !isLicenseValid,
    tooltipContent: isLicenseValid ? undefined : ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE,
    splitButtonProps: {
      iconType: 'chevronSingleDown',
      isSecondaryButtonDisabled: !isLicenseValid,
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
}

const UNIVERSAL_RULES_ONLY_CALLOUT_BODY = i18n.translate(
  'xpack.alertingV2.actionPolicies.universalRulesOnlyCalloutBody',
  {
    defaultMessage:
      'Action policies only apply to alerts from Universal rules and external alerts.',
  }
);

/**
 * App header that reads Content List phase so the create menu stays hidden
 * during the true empty state (create options live in that empty state).
 * Must render under {@link ContentListProvider}.
 */
export const ActionPoliciesListHeader = ({
  canWrite,
  onCreatePolicy,
  onCreateWithAgent,
}: ActionPoliciesListHeaderProps) => {
  const phase = useContentListPhase();
  const { links } = useService(CoreStart('docLinks'));
  const showHeaderMenu = canWrite && phase !== 'empty' && phase !== 'initialLoad';
  const createWithAgentDisabled = !useAreAgentBuilderSkillsAvailable();
  const createWithAgentTooltipText = getCreateActionPolicyWithAgentTooltipText(
    useAgentBuilderSkillsRequirements()
  );
  const isLicenseValid = useIsActionPoliciesLicenseValid();

  const headerMenu = useMemo(
    () =>
      showHeaderMenu
        ? getActionPoliciesListMenu({
            onCreatePolicy,
            onCreateWithAgent,
            createWithAgentDisabled,
            createWithAgentTooltipText,
            isLicenseValid,
          })
        : undefined,
    [
      showHeaderMenu,
      onCreatePolicy,
      onCreateWithAgent,
      createWithAgentDisabled,
      createWithAgentTooltipText,
      isLicenseValid,
    ]
  );

  return (
    <>
      <AppHeader
        sticky={false}
        title={ACTION_POLICIES_LIST_PAGE_TITLE}
        badges={[universalRulesOnlyBadge]}
        spacing="bleed"
        menu={headerMenu}
        docLink={links.alerting.manageActionPolicies}
      />
      <EuiSpacer size="m" />
      <UniversalRulesOnlyCallout
        appId={ALERTING_V2_ACTION_POLICIES_APP_ID}
        description={UNIVERSAL_RULES_ONLY_CALLOUT_BODY}
      />
      {canWrite && <ActionPoliciesLicenseCallout />}
    </>
  );
};
