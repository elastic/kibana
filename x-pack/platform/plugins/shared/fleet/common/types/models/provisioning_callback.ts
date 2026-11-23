/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AccountType, CloudConnectorIacState, CloudProvider } from './cloud_connector';

/**
 * The cloud providers whose launched deployment can report back through a provisioning callback.
 * A record's `provider` selects how its report is checked and what it creates; a provider not
 * listed here has no receiver in this Kibana, so no record is created for it.
 */
export const PROVISIONING_CALLBACK_PROVIDERS: readonly CloudProvider[] = ['aws'];

export const isProvisioningCallbackProvider = (value: unknown): value is CloudProvider =>
  PROVISIONING_CALLBACK_PROVIDERS.includes(value as CloudProvider);

/**
 * `receiving` is the window between a report being accepted and what it creates existing;
 * `cancelled` is a record the browser retired, for example because the identity was created by hand.
 */
export type ProvisioningCallbackStatus = 'pending' | 'receiving' | 'received' | 'cancelled';

/**
 * A one-time record that lets something launched from Kibana report back to it, whatever the
 * report creates. The record has a short-lived random token, which is not a credential and admits
 * nothing but the report. The token is returned once, when the record is created, and only its
 * hash is stored. Flows extend this with what they store at launch and what the report carries.
 */
export interface ProvisioningCallback {
  id: string;
  /** Which cloud the launched deployment runs in; decides how its report is checked and what it creates. */
  provider: CloudProvider;
  status: ProvisioningCallbackStatus;
  created_at: string;
  created_by?: string;
  /** Space the launch happened in. The record is space-agnostic because the stack calls Kibana without a space. */
  space_id?: string;
  expires_at: string;
  received_at?: string;
}

/** What the stack's Lambda reports once the IAM role exists. */
export interface CloudConnectorCallbackReceivedValues {
  role_arn: string;
  stack_arn: string;
}

/**
 * Proof of the AWS account a report was sent from: an STS `GetCallerIdentity` request the
 * reporting Lambda signed with its execution-role credentials, which Kibana forwards to STS. The
 * callback id and the SHA-256 of the reported values are signed headers, so the proof fits one
 * record and one report only. Kibana builds the STS URL from `region` itself; no URL is accepted.
 */
export interface CloudConnectorCallerIdentityProof {
  /** The region of the regional STS endpoint the request was signed for. */
  region: string;
  /** The signed request headers, including `Authorization` and the two binding headers. */
  headers: Record<string, string>;
  /** The signed request body; always `Action=GetCallerIdentity&Version=2011-06-15`. */
  body: string;
}

/**
 * The report as the launched deployment sends it: the values plus `origin_proof`, the proof of
 * which account they came from. The proof's shape is the provider's; for AWS it is a signed STS
 * `GetCallerIdentity` request.
 */
export interface CloudConnectorCallbackReport extends CloudConnectorCallbackReceivedValues {
  origin_proof: CloudConnectorCallerIdentityProof;
}

/**
 * Cloud connector details the browser stores on the record at launch. Kibana uses them to create
 * the cloud connector when the stack reports back; the template fields are the ones the
 * connector stores.
 */
export interface CloudConnectorCallbackIdentity
  extends Pick<CloudConnectorIacState, 'iac_key' | 'iac_blueprint_id' | 'iac_blueprint_version'> {
  connector_name?: string;
  account_type?: AccountType;
}

/**
 * A callback whose report creates a cloud connector: the identity stored at launch, the ARNs the
 * stack reported, and the connector made from them.
 */
export interface CloudConnectorCallback
  extends ProvisioningCallback,
    CloudConnectorCallbackIdentity,
    Partial<CloudConnectorCallbackReceivedValues> {
  /** Set when the stack's report has created the cloud connector. */
  cloud_connector_id?: string;
}
