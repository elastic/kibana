/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsClient } from '@elastic/ebt/client';
export interface CloudDeploymentMetadata {
  id?: string;
  organization_id?: string;
  trial_end_date?: string;
  is_elastic_staff_owned?: boolean;
  deployment_url?: string;
  serverless?: {
    project_id?: string;
    project_type?: string;
    product_tier?: string;
    orchestrator_target?: string;
    in_trial?: boolean;
  };
}
export declare function registerCloudDeploymentMetadataAnalyticsContext(
  analytics: Pick<AnalyticsClient, 'registerContextProvider'>,
  cloudMetadata: CloudDeploymentMetadata
): void;
