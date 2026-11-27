/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ICONS } from '../../icons';
import { CLAIM_STATUS_COLORS, CLAIM_STATUS_LABELS } from './claim_utils';
import * as i18n from './translations';

export interface ClaimsExplainerProps {
  /** Whether agents work on this investigation. */
  aiEnabled: boolean;
  agentName: string;
}

const Steps: React.FC<{ title: string; icon: string; steps: readonly string[] }> = ({
  title,
  icon,
  steps,
}) => (
  <EuiPanel color="subdued" hasShadow={false} paddingSize="s">
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={icon} aria-hidden="true" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiText size="xs">
      <ol>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </EuiText>
  </EuiPanel>
);
Steps.displayName = 'Steps';

/** How agents and people populate claims, and the claim lifecycle. */
export const ClaimsExplainer: React.FC<ClaimsExplainerProps> = ({ aiEnabled, agentName }) => (
  <div data-test-subj="investigationClaimsExplainer">
    <EuiFlexGrid columns={aiEnabled ? 2 : 1} gutterSize="m">
      {aiEnabled ? (
        <EuiFlexItem>
          <Steps
            title={i18n.EXPLAIN_AGENT_TITLE(agentName)}
            icon={ICONS.agent}
            steps={i18n.EXPLAIN_AGENT_STEPS}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem>
        <Steps
          title={i18n.EXPLAIN_PEOPLE_TITLE}
          icon={ICONS.user}
          steps={i18n.EXPLAIN_PEOPLE_STEPS}
        />
      </EuiFlexItem>
    </EuiFlexGrid>
    <EuiSpacer size="s" />
    <EuiPanel color="subdued" hasShadow={false} paddingSize="s">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>{i18n.EXPLAIN_LIFECYCLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={CLAIM_STATUS_COLORS.open}>{CLAIM_STATUS_LABELS.open}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type={ICONS.chevronRight} aria-hidden="true" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={CLAIM_STATUS_COLORS.supported}>{CLAIM_STATUS_LABELS.supported}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.OR}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={CLAIM_STATUS_COLORS.refuted}>{CLAIM_STATUS_LABELS.refuted}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.EXPLAIN_OPEN_BLOCKED}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </div>
);
ClaimsExplainer.displayName = 'ClaimsExplainer';
