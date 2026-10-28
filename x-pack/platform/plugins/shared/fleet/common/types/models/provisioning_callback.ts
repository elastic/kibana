/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AccountType, CloudConnectorIacState } from './cloud_connector';

/**
 * `receiving` is the window between a report being accepted and what it creates existing;
 * `cancelled` is a record the browser retired, for example because the identity was created by hand.
 */
export type ProvisioningCallbackStatus = 'pending' | 'receiving' | 'received' | 'cancelled';

/**
 * Stage of the server-side deploy that follows a received report when an onboarding deployment
 * is attached. `pending` until the report lands, `deploying` while policies are created.
 */
export type ProvisioningCallbackDeployStatus = 'pending' | 'deploying' | 'deployed' | 'failed';

/**
 * A one-time record that lets something launched from Kibana report back to it, whatever the
 * report creates. The record has a short-lived random token, which is not a credential and admits
 * nothing but the report. The token is returned once, when the record is created, and only its
 * hash is stored. Flows extend this with what they store at launch and what the report carries.
 */
export interface ProvisioningCallback {
  id: string;
  provider: 'aws';
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
 * Cloud connector details the browser stores on the record at launch. Kibana uses them to create
 * the cloud connector when the stack reports back; the template fields are the ones the
 * connector stores.
 */
export interface CloudConnectorCallbackIdentity
  extends Pick<CloudConnectorIacState, 'iac_key' | 'iac_blueprint_id' | 'iac_blueprint_version'> {
  connector_name?: string;
  account_type?: AccountType;
  /**
   * Onboarding deployment whose stored agentless policies the server deploys once the stack has
   * reported back. Set at launch by the ingest hub only.
   */
  onboarding_deployment_id?: string;
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
  /** Present only when an onboarding deployment is attached. Written by the deploy executor. */
  deploy_status?: ProvisioningCallbackDeployStatus;
  deploy_error?: string;
}
