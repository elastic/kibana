/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ILicense } from '@kbn/licensing-types';
import type { SubscriptionStatus, SubscriptionStatusAction } from './types';

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;
/** Length of the trial Elasticsearch starts. Extended trials run longer, so the meter is clamped. */
const TRIAL_LENGTH_IN_DAYS = 30;
const URGENT_DAYS_LEFT = 3;

type PopoverStatus = Extract<SubscriptionStatus, { kind: 'popover' }>;

const START_CLOUD_TRIAL_URL = 'https://cloud.elastic.co/registration';

export interface ResolveSelfManagedStatusParams {
  license: Pick<ILicense, 'isAvailable' | 'type' | 'status' | 'expiryDateInMillis'>;
  canManageLicense: boolean;
  urls: {
    compareFeatures: string;
    manageLicense: string;
  };
}

const formatDate = (millis: number): string =>
  new Intl.DateTimeFormat(i18n.getLocale(), { dateStyle: 'medium' }).format(millis);

const getCompareFeaturesAction = (href: string): SubscriptionStatusAction => ({
  id: 'compare_features',
  label: i18n.translate('xpack.subscriptionStatus.selfManaged.compareFeaturesLabel', {
    defaultMessage: 'Compare license features',
  }),
  href,
  external: true,
});

/** License admins manage the license in Kibana; everyone else can only compare licenses. */
const getTrialActions = ({
  canManageLicense,
  urls,
}: ResolveSelfManagedStatusParams): Pick<
  PopoverStatus,
  'primaryAction' | 'primaryActionStyle' | 'secondaryAction'
> => {
  const compareFeatures = getCompareFeaturesAction(urls.compareFeatures);
  if (!canManageLicense) return { primaryAction: compareFeatures, primaryActionStyle: 'tinted' };

  return {
    primaryAction: {
      id: 'manage_license',
      label: i18n.translate('xpack.subscriptionStatus.selfManaged.manageLicenseLabel', {
        defaultMessage: 'Manage license',
      }),
      href: urls.manageLicense,
      external: false,
    },
    secondaryAction: compareFeatures,
  };
};

const resolveActiveTrial = (
  expiryDateInMillis: number,
  params: ResolveSelfManagedStatusParams
): SubscriptionStatus => {
  const daysLeft = Math.max(0, Math.ceil((expiryDateInMillis - Date.now()) / DAY_IN_MILLIS));
  const urgent = daysLeft <= URGENT_DAYS_LEFT;

  return {
    kind: 'popover',
    label: i18n.translate('xpack.subscriptionStatus.selfManaged.trialLabel', {
      defaultMessage: 'Trial',
    }),
    badgeColor: urgent ? 'warning' : undefined,
    meter: {
      label: i18n.translate('xpack.subscriptionStatus.selfManaged.trialMeterLabel', {
        defaultMessage: 'Enterprise trial',
      }),
      value: i18n.translate('xpack.subscriptionStatus.selfManaged.trialDaysLeft', {
        defaultMessage: '{daysLeft, plural, one {# day} other {# days}} left',
        values: { daysLeft },
      }),
      detail: i18n.translate('xpack.subscriptionStatus.selfManaged.trialExpires', {
        defaultMessage: 'Expires {date}',
        values: { date: formatDate(expiryDateInMillis) },
      }),
      percent: Math.max(0, ((TRIAL_LENGTH_IN_DAYS - daysLeft) / TRIAL_LENGTH_IN_DAYS) * 100),
      urgent,
    },
    ...getTrialActions(params),
    licenseType: 'trial',
  };
};

const resolveExpiredTrial = (
  expiryDateInMillis: number,
  params: ResolveSelfManagedStatusParams
): SubscriptionStatus => {
  const { canManageLicense } = params;

  return {
    kind: 'popover',
    label: i18n.translate('xpack.subscriptionStatus.selfManaged.trialExpiredLabel', {
      defaultMessage: 'Trial expired',
    }),
    badgeColor: 'warning',
    title: i18n.translate('xpack.subscriptionStatus.selfManaged.trialExpiredTitle', {
      defaultMessage: 'Your trial ended on {date}',
      values: { date: formatDate(expiryDateInMillis) },
    }),
    description: canManageLicense
      ? i18n.translate('xpack.subscriptionStatus.selfManaged.trialExpiredDescription', {
          defaultMessage: 'Paid features are no longer available.',
        })
      : i18n.translate('xpack.subscriptionStatus.selfManaged.trialExpiredNoAccessDescription', {
          defaultMessage:
            'Paid features are no longer available. Contact your admin to update the license.',
        }),
    ...getTrialActions(params),
    licenseType: 'trial',
  };
};

const resolveBasic = ({ urls }: ResolveSelfManagedStatusParams): SubscriptionStatus => ({
  kind: 'popover',
  label: i18n.translate('xpack.subscriptionStatus.selfManaged.basicLabel', {
    defaultMessage: 'Basic',
  }),
  badgeColor: 'hollow',
  description: i18n.translate('xpack.subscriptionStatus.selfManaged.basicDescription', {
    defaultMessage: "You're on the free Basic license.",
  }),
  primaryAction: getCompareFeaturesAction(urls.compareFeatures),
  primaryActionStyle: 'tinted',
  secondaryAction: {
    id: 'start_cloud_trial',
    label: i18n.translate('xpack.subscriptionStatus.selfManaged.startCloudTrialLabel', {
      defaultMessage: 'Start a cloud trial',
    }),
    href: START_CLOUD_TRIAL_URL,
    external: true,
  },
  licenseType: 'basic',
});

/** Resolves the subscription status of a self-managed cluster, or `undefined` when no badge applies. */
export const resolveSelfManagedStatus = (
  params: ResolveSelfManagedStatusParams
): SubscriptionStatus | undefined => {
  const { isAvailable, type, status, expiryDateInMillis } = params.license;
  if (!isAvailable) return undefined;

  switch (type) {
    case 'trial': {
      if (expiryDateInMillis === undefined) return undefined;
      switch (status) {
        case 'active':
          return resolveActiveTrial(expiryDateInMillis, params);
        case 'expired':
          return resolveExpiredTrial(expiryDateInMillis, params);
        case 'invalid':
        case undefined:
          return undefined;
        default: {
          const exhaustiveCheck: never = status;
          return exhaustiveCheck;
        }
      }
    }
    case 'basic':
      return resolveBasic(params);
    case 'standard':
    case 'gold':
    case 'platinum':
    case 'enterprise':
    case undefined:
      return undefined;
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
};
