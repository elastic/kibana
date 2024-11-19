/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import { AssistantAvatar } from './assistant_avatar/assistant_avatar';
import * as i18n from './translations';

interface Props {
  actions?: React.ReactNode;
  availabilityMessage: string;
  upgradeMessage: string;
}

/**
 * This `section` component handles (just) the styling of the upselling message
 * (by itself, without the page wrapper)
 */
const AttackDiscoveryUpsellingSectionComponent: React.FC<Props> = ({
  actions,
  availabilityMessage,
  upgradeMessage,
}) => {
  const title = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
        <EuiFlexItem data-test-subj="assistantAvatar" grow={false}>
          <AssistantAvatar size="m" />
          <EuiSpacer size="m" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" direction="row" gutterSize="none">
            <EuiFlexItem data-test-subj="upgradeTitle" grow={false}>
              <span>{i18n.FIND_POTENTIAL_ATTACKS_WITH_AI}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const body = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="availabilityMessage">
            {availabilityMessage}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText color="subdued" data-test-subj="upgradeMessage">
            {upgradeMessage}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [availabilityMessage, upgradeMessage]
  );

  return <EuiEmptyPrompt actions={actions} body={body} data-test-subj="upgrade" title={title} />;
};

AttackDiscoveryUpsellingSectionComponent.displayName = 'AttackDiscoveryUpsellingSection';

export const AttackDiscoveryUpsellingSection = React.memo(AttackDiscoveryUpsellingSectionComponent);
