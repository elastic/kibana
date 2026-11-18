/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import { TrialBadge } from '@kbn/context-switcher-components';
import { i18n } from '@kbn/i18n';

const PRICING_SOLUTIONS: Record<string, string> = {
  search: 'elasticsearch',
  observability: 'observability',
  security: 'security',
  vectordb: 'vectordb',
};

/** Same headings as the serverless subscription popover. */
const getTrialTitle = (projectType?: string): string => {
  switch (projectType) {
    case 'search':
      return i18n.translate('xpack.spaces.contextSwitcher.trialBadge.searchTitle', {
        defaultMessage: 'Elasticsearch Serverless',
      });
    case 'observability':
      return i18n.translate('xpack.spaces.contextSwitcher.trialBadge.observabilityTitle', {
        defaultMessage: 'Elastic Observability Serverless',
      });
    case 'security':
      return i18n.translate('xpack.spaces.contextSwitcher.trialBadge.securityTitle', {
        defaultMessage: 'Elastic Security Serverless',
      });
    case 'vectordb':
      return i18n.translate('xpack.spaces.contextSwitcher.trialBadge.vectordbTitle', {
        defaultMessage: 'Elasticsearch Vector Database',
      });
    default:
      return i18n.translate('xpack.spaces.contextSwitcher.trialBadge.defaultTitle', {
        defaultMessage: 'Elastic Cloud Serverless',
      });
  }
};

const getPricingHref = (cloud?: CloudStart, projectType?: string): string | undefined => {
  const baseUrl = cloud?.getUrls().baseUrl?.replace(/\/$/, '');
  if (!baseUrl) return undefined;

  const params = new URLSearchParams({ productType: 'serverless' });
  const solution = projectType ? PRICING_SOLUTIONS[projectType] : undefined;
  if (solution) params.set('solution', solution);
  return `${baseUrl}/cloud-pricing-table?${params}`;
};

/**
 * Trial badge fed with the same subscription popover content as the header badge.
 */
export const TrialBadgeSlot = ({
  cloud,
  projectType,
}: {
  cloud?: CloudStart;
  projectType?: string;
}) => {
  const [subscribeHref, setSubscribeHref] = useState<string>();

  useEffect(() => {
    if (!cloud) return;

    let current = true;
    cloud
      .getPrivilegedUrls()
      .then((urls) => {
        if (current) setSubscribeHref(urls.billingUrl);
      })
      .catch(() => {
        // The popover still shows Subscribe without a destination.
      });

    return () => {
      current = false;
    };
  }, [cloud]);

  return (
    <TrialBadge
      title={getTrialTitle(projectType)}
      subscribeHref={subscribeHref}
      pricingHref={getPricingHref(cloud, projectType)}
    />
  );
};
