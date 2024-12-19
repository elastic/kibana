/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, ToastsStart } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ClientConfigType, ReportingAPIClient } from '@kbn/reporting-public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
export interface ListingProps {
  apiClient: ReportingAPIClient;
  license$: LicensingPluginStart['license$'];
  config: ClientConfigType;
  redirect: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  toasts: ToastsStart;
  urlService: SharePluginStart['url'];
}

export type ListingPropsInternal = ListingProps & {
  capabilities: ApplicationStart['capabilities'];
};

export { ReportListing } from './report_listing';
