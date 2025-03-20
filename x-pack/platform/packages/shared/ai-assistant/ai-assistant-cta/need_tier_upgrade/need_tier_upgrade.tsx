/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { AssistantCallToAction } from '../call_to_action';

import { translations } from './need_tier_upgrade.translations';
import { CallToActionCard } from '../call_to_action_panel';

/**
 * Props for the `NeedTierUpgrade` call to action.
 */
export interface NeedTierUpgradeProps {
  /** Callback to handle managing the subscription. */
  onManageSubscription: () => void;
}

/**
 * A pure component that renders a call to action to upgrade the tier on a Serverless project.
 */
export const NeedTierUpgrade = ({ onManageSubscription }: NeedTierUpgradeProps) => (
  <AssistantCallToAction title={translations.title} description={translations.description}>
    <CallToActionCard
      iconType="lock"
      color="warning"
      title={translations.cardTitle}
      description={translations.cardDescription}
    >
      <EuiButton color="warning" fill onClick={onManageSubscription}>
        {translations.buttonLabel}
      </EuiButton>
    </CallToActionCard>
  </AssistantCallToAction>
);
