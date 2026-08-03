/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EnterpriseGatingModalPrimaryAction } from './enterprise_gating_modal';

const assertNever = (value: never): never => {
  throw new Error(`Unhandled primary action: ${value}`);
};

export const getPrimaryActionLabel = (action: EnterpriseGatingModalPrimaryAction): string => {
  switch (action) {
    case 'startTrial':
      return i18n.translate(
        'xpack.dataLifecyclePhases.enterpriseGatingModal.startTrialButtonLabel',
        {
          defaultMessage: 'Start 30-day enterprise trial',
        }
      );
    case 'upgrade':
      return i18n.translate('xpack.dataLifecyclePhases.enterpriseGatingModal.upgradeButtonLabel', {
        defaultMessage: 'Upgrade to Enterprise',
      });
    case 'contactUs':
      return i18n.translate(
        'xpack.dataLifecyclePhases.enterpriseGatingModal.contactUsButtonLabel',
        {
          defaultMessage: 'Contact us',
        }
      );
    default:
      return assertNever(action);
  }
};

export const enterpriseGatingModalStrings = {
  title: i18n.translate('xpack.dataLifecyclePhases.enterpriseGatingModal.title', {
    defaultMessage: 'Unlock the frozen data phase by upgrading to Enterprise',
  }),
  cancelButtonLabel: i18n.translate(
    'xpack.dataLifecyclePhases.enterpriseGatingModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  reviewSubscriptionFeaturesButtonLabel: i18n.translate(
    'xpack.dataLifecyclePhases.enterpriseGatingModal.reviewSubscriptionFeaturesButtonLabel',
    {
      defaultMessage: 'Review subscription features',
    }
  ),
  benefits: [
    {
      id: 'costSavings',
      title: i18n.translate(
        'xpack.dataLifecyclePhases.enterpriseGatingModal.costSavingsBenefitTitle',
        {
          defaultMessage: 'Massive cost savings:',
        }
      ),
      description: i18n.translate(
        'xpack.dataLifecyclePhases.enterpriseGatingModal.costSavingsBenefitDescription',
        {
          defaultMessage:
            'Reduce costs by storing aging data in low-cost object storage via searchable snapshots.',
        }
      ),
    },
    {
      id: 'searchability',
      title: i18n.translate(
        'xpack.dataLifecyclePhases.enterpriseGatingModal.searchabilityBenefitTitle',
        {
          defaultMessage: 'Seamless searchability:',
        }
      ),
      description: i18n.translate(
        'xpack.dataLifecyclePhases.enterpriseGatingModal.searchabilityBenefitDescription',
        {
          defaultMessage:
            'Query years of historical data instantly. No manual restoration or rehydration required.',
        }
      ),
    },
    {
      id: 'scale',
      title: i18n.translate('xpack.dataLifecyclePhases.enterpriseGatingModal.scaleBenefitTitle', {
        defaultMessage: 'Near unlimited scale:',
      }),
      description: i18n.translate(
        'xpack.dataLifecyclePhases.enterpriseGatingModal.scaleBenefitDescription',
        {
          defaultMessage:
            'Retain large datasets for long-term compliance and auditing without straining local hardware.',
        }
      ),
    },
  ],
};
