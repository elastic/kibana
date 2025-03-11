/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { AssistantCallToAction } from '../call_to_action';

import { translations } from './need_tier_upgrade.translations';

/**
 * Props for the `NeedTierUpgrade` call to action.
 */
export interface NeedTierUpgradeProps {
  onManageSubscription: () => void;
}

const NeedTierUpgradePanel = ({ onManageSubscription }: NeedTierUpgradeProps) => (
  <EuiCallOut iconType="lock" title={translations.panelTitle} color="warning">
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiText size="s">{translations.panelDescription}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <span>
          <EuiButton color="warning" fill onClick={onManageSubscription}>
            {translations.buttonLabel}
          </EuiButton>
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);

/**
 * A pure component that renders a call to action to upgrade the tier on a Serverless project.
 */
export const NeedTierUpgrade = (props: NeedTierUpgradeProps) => (
  <AssistantCallToAction title={translations.title} description={translations.description}>
    <NeedTierUpgradePanel {...props} />
  </AssistantCallToAction>
);
