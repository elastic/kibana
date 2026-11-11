/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SubscriptionStatus } from './types';

export type ProjectType = NonNullable<CloudStart['serverless']['projectType']>;

export type ServerlessCloud = Pick<
  CloudStart,
  'isServerlessEnabled' | 'serverless' | 'getPrivilegedUrls'
>;

interface ResolveServerlessStatusParams {
  cloud: ServerlessCloud;
  csp?: string;
  region?: string;
}

const getTitle = (projectType?: ProjectType): string => {
  switch (projectType) {
    case 'search':
      return i18n.translate('xpack.subscriptionStatus.serverless.searchTitle', {
        defaultMessage: 'Elasticsearch Serverless',
      });
    case 'observability':
      return i18n.translate('xpack.subscriptionStatus.serverless.observabilityTitle', {
        defaultMessage: 'Elastic Observability Serverless',
      });
    case 'security':
      return i18n.translate('xpack.subscriptionStatus.serverless.securityTitle', {
        defaultMessage: 'Elastic Security Serverless',
      });
    case 'vectordb':
      return i18n.translate('xpack.subscriptionStatus.serverless.vectordbTitle', {
        defaultMessage: 'Elasticsearch Vector Database',
      });
    case undefined:
      return i18n.translate('xpack.subscriptionStatus.serverless.defaultTitle', {
        defaultMessage: 'Elastic Cloud Serverless',
      });
    default: {
      const exhaustiveCheck: never = projectType;
      return exhaustiveCheck;
    }
  }
};

const CSP_LABELS: Record<string, string> = { aws: 'AWS', gcp: 'GCP', azure: 'Azure' };

const getRegionLabel = (csp?: string, region?: string): string | undefined => {
  if (!csp || !region) return undefined;
  return `${CSP_LABELS[csp] ?? csp} (${region})`;
};

// Cloud UI opens the dialog for the intent when the org supports it, and stays on the billing overview otherwise.
const withBillingIntent = (billingUrl: string, intent: 'subscribe' | 'trial_summary'): string => {
  const url = new URL(billingUrl);
  url.searchParams.set('intent', intent);
  return url.toString();
};

/** Resolves the subscription status of a Serverless project, or `undefined` when no badge applies. */
export const resolveServerlessStatus = async ({
  cloud,
  csp,
  region,
}: ResolveServerlessStatusParams): Promise<SubscriptionStatus | undefined> => {
  const { isServerlessEnabled, serverless } = cloud;
  if (!isServerlessEnabled || !serverless.organizationInTrial) return undefined;

  const { projectType } = serverless;
  const label = i18n.translate('xpack.subscriptionStatus.serverless.trialLabel', {
    defaultMessage: 'Trial',
  });

  const billingUrl = await cloud.getPrivilegedUrls().then(
    (urls) => urls.billingUrl,
    () => undefined
  );
  if (!billingUrl) {
    return {
      kind: 'tooltip',
      label,
      tooltip: i18n.translate('xpack.subscriptionStatus.serverless.noBillingAccessTooltip', {
        defaultMessage: 'Contact your administrator to update the subscription',
      }),
      projectType,
    };
  }

  return {
    kind: 'popover',
    label,
    title: getTitle(projectType),
    subtitle: getRegionLabel(csp, region),
    description: i18n.translate('xpack.subscriptionStatus.serverless.trialDescription', {
      defaultMessage: "You're on an Elastic Cloud trial.",
    }),
    primaryAction: {
      id: 'subscribe',
      label: i18n.translate('xpack.subscriptionStatus.serverless.subscribeLabel', {
        defaultMessage: 'Subscribe',
      }),
      href: withBillingIntent(billingUrl, 'subscribe'),
      external: true,
    },
    secondaryAction: {
      id: 'view_pricing',
      label: i18n.translate('xpack.subscriptionStatus.serverless.viewPricingLabel', {
        defaultMessage: 'View pricing',
      }),
      href: withBillingIntent(billingUrl, 'trial_summary'),
      external: true,
    },
    projectType,
  };
};
