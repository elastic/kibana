/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// AWS console service categories.
//
// Shaped after INTEGRATION_CATEGORY_DISPLAY in the custom_integrations plugin: an
// id-keyed table where slugs are identity and titles are display-only. Kept local
// rather than added to that shared map for two reasons:
//
//   1. The Browse integrations page counts facets from *package-level* categories and
//      drops any with count === 0. AWS is a single package, so per-service categories
//      have nothing to attach to there.
//   2. This is AWS-console vocabulary ("Cloud Financial Management"); Azure and GCP name
//      the same concepts differently. It does not belong in a vendor-neutral list.
//
// Deliberately no `parent_id`: the shared map needs it for a two-level tree spanning all
// integrations, but every entry here would carry the same constant `'aws'`. Add it only
// if a second cloud provider's onboarding starts reusing this module.

import { i18n } from '@kbn/i18n';

/**
 * Declaration order is sidebar display order — see CATEGORY_ORDER below.
 * Titles are resolved lazily by getCategoryTitle so i18n.translate is not
 * called at module-evaluation time, before the i18n service is started.
 */
const AWS_SERVICE_CATEGORY_TITLES = {
  security_identity_compliance: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.securityIdentityCompliance', {
      defaultMessage: 'Security, Identity and Compliance',
    }),
  compute: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.compute', {
      defaultMessage: 'Compute',
    }),
  networking_content_delivery: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.networkingContentDelivery', {
      defaultMessage: 'Networking and Content Delivery',
    }),
  storage: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.storage', {
      defaultMessage: 'Storage',
    }),
  databases: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.databases', {
      defaultMessage: 'Databases',
    }),
  analytics: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.analytics', {
      defaultMessage: 'Analytics',
    }),
  cloud_financial_management: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.cloudFinancialManagement', {
      defaultMessage: 'Cloud Financial Management',
    }),
  management_governance: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.managementGovernance', {
      defaultMessage: 'Management and Governance',
    }),
  application_integration: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.applicationIntegration', {
      defaultMessage: 'Application Integration',
    }),
  machine_learning: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.machineLearning', {
      defaultMessage: 'Machine Learning',
    }),
  containers: () =>
    i18n.translate('xpack.ingestHub.serviceCategory.containers', {
      defaultMessage: 'Containers',
    }),
} satisfies Record<string, () => string>;

export type ServiceCategory = keyof typeof AWS_SERVICE_CATEGORY_TITLES;

/** Sidebar display order — object declaration order above. */
export const CATEGORY_ORDER = Object.keys(AWS_SERVICE_CATEGORY_TITLES) as ServiceCategory[];

export function getCategoryTitle(id: ServiceCategory): string {
  return AWS_SERVICE_CATEGORY_TITLES[id]();
}
