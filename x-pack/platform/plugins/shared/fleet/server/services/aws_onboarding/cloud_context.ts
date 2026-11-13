/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';

import { getWorkloadIdentityFederationStackParams } from '../../../common/services/cloud_connector_template';

/**
 * The server cloud contract has no `deploymentUrl`; the shared helper then relies on
 * `deploymentId` and the cloud ID alone.
 */
export const getWorkloadIdentityStackParameters = (
  cloud: CloudSetup | undefined
): Record<string, string> => getWorkloadIdentityFederationStackParams(cloud);
