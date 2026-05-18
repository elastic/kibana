/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Canonical destination URL + label per `policy_template`. Surfaces in the Permission
 * Status popover and row-expand footer as the "Open dashboard" affordance.
 *
 * For templates not listed here, a generic "Open in Integrations" fallback links to
 * the package policy's edit/detail page.
 */

export interface DashboardLinkContext {
  /** The TARGET integration's package policy id (not the verifier's). */
  packagePolicyId: string;
}

export interface DashboardLink {
  label: string;
  href: string;
  /** When true, opens in a new tab so the flyout stays in context. */
  newTab: boolean;
}

type LinkResolver = (ctx: DashboardLinkContext) => DashboardLink;

const linkLabel = (id: string, defaultMessage: string) =>
  i18n.translate(`xpack.fleet.cloudConnector.permissionStatus.dashboardLink.${id}`, {
    defaultMessage,
  });

const TEMPLATE_LINKS: Record<string, LinkResolver> = {
  cspm: () => ({
    label: linkLabel('cspm', 'Open CSPM dashboard'),
    href: '/app/security/cloud_security/dashboard',
    newTab: true,
  }),
  asset_inventory: () => ({
    label: linkLabel('assetInventory', 'Open Asset Inventory'),
    href: '/app/security/cloud_security/inventory',
    newTab: true,
  }),
  cloudtrail: ({ packagePolicyId }) => ({
    label: linkLabel('cloudtrail', 'Open CloudTrail dashboard'),
    href: `/app/dashboards#/view/aws-cloudtrail-overview?package_policy=${encodeURIComponent(
      packagePolicyId
    )}`,
    newTab: true,
  }),
  guardduty: () => ({
    label: linkLabel('guardduty', 'Open GuardDuty findings'),
    href: '/app/security/alerts',
    newTab: true,
  }),
  securityhub: () => ({
    label: linkLabel('securityhub', 'Open Security Hub findings'),
    href: '/app/security/alerts',
    newTab: true,
  }),
  vpcflow: ({ packagePolicyId }) => ({
    label: linkLabel('vpcflow', 'Open VPC Flow logs'),
    href: `/app/discover#/?_a=(index:'logs-aws.vpcflow-*',filters:!((meta:(key:package_policy.id),query:(match_phrase:(package_policy.id:${encodeURIComponent(
      packagePolicyId
    )})))))`,
    newTab: true,
  }),
};

const fallback: LinkResolver = ({ packagePolicyId }) => ({
  label: linkLabel('fallback', 'Open in Integrations'),
  href: `/app/integrations/edit-integration/${encodeURIComponent(packagePolicyId)}`,
  newTab: true,
});

/**
 * Resolve the dashboard link for a given policy template. Returns a fallback
 * link (integration detail page) when the template isn't recognized.
 */
export function getDashboardLink(policyTemplate: string, ctx: DashboardLinkContext): DashboardLink {
  const resolver = TEMPLATE_LINKS[policyTemplate] ?? fallback;
  return resolver(ctx);
}

/** Exported for unit tests / consumers that want to introspect known templates. */
export const KNOWN_DASHBOARD_TEMPLATES = Object.keys(TEMPLATE_LINKS);
