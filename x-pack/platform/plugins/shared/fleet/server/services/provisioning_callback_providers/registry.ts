/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudProvider } from '../../../common/types/models/cloud_connector';
import type {
  CloudConnectorCallbackReceivedValues,
  CloudConnectorCallerIdentityProof,
} from '../../../common/types/models/provisioning_callback';

import { awsProvisioningCallbackProvider } from './aws';
import type { ProvisioningCallbackProvider } from './types';

/** A provider module as the service sees it. One report shape exists until more providers land. */
export type RegisteredProvisioningCallbackProvider = ProvisioningCallbackProvider<
  CloudConnectorCallbackReceivedValues,
  CloudConnectorCallerIdentityProof
>;

/**
 * The providers this Kibana can receive a callback for. Must match
 * `PROVISIONING_CALLBACK_PROVIDERS`, which the request schemas use, and
 * `PROVISIONING_CALLBACK_REPORT_SCHEMAS`, the shapes the receive route accepts; tests keep them
 * aligned.
 */
const PROVIDERS: Partial<Record<CloudProvider, RegisteredProvisioningCallbackProvider>> = {
  aws: awsProvisioningCallbackProvider,
};

export const getProvisioningCallbackProvider = (
  provider: CloudProvider
): RegisteredProvisioningCallbackProvider | undefined => PROVIDERS[provider];

export const registeredProvisioningCallbackProviders = (): CloudProvider[] =>
  Object.keys(PROVIDERS) as CloudProvider[];
