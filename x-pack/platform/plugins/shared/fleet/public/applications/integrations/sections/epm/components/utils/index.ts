/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, RegistryPolicyTemplate } from '../../../../types';

export { promoteFeaturedIntegrations } from './promote_featured_integrations';

// Everywhere we display the title of an integration, we need to add the "(deprecated)" suffix if the integration is deprecated.
// if the title already contains " (deprecated)", don't add it again, e.g. "Log Management (deprecated)"
export const wrapTitleWithDeprecated = ({
  title,
  deprecated,
  packageInfo,
  integrationInfo,
  defaultTitle = '',
}: {
  title?: string;
  deprecated?: boolean;
  packageInfo?: PackageInfo | null;
  integrationInfo?: RegistryPolicyTemplate;
  defaultTitle?: string;
}) => {
  const titleToWrap = title || integrationInfo?.title || packageInfo?.title || defaultTitle;
  const isDeprecated: boolean =
    deprecated ||
    !!packageInfo?.deprecated ||
    !!packageInfo?.conditions?.deprecated ||
    !!integrationInfo?.deprecated ||
    false;
  return isDeprecated &&
    !titleToWrap.match(/ \(deprecated\)$/) &&
    !titleToWrap.match(/ \(Deprecated\)$/)
    ? `${titleToWrap} (Deprecated)`
    : titleToWrap;
};
