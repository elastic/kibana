/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AccountType } from './cloud_connector';

export type IacCallbackStatus = 'pending' | 'received';

/** What the stack's Lambda reports once the IAM role exists. */
export interface IacCallbackReceivedValues {
  role_arn: string;
  stack_arn: string;
}

/**
 * Identity details the browser stores on the record at launch. Kibana uses them to create the
 * cloud connector when the stack reports back.
 */
export interface IacCallbackIdentity {
  connector_name?: string;
  account_type?: AccountType;
  iac_key?: string | null;
  iac_blueprint_id?: string | null;
  iac_blueprint_version?: string | null;
}

/**
 * A one-time record that lets a launched CloudFormation stack report its role ARN and stack ARN
 * back to Kibana. The record has a short-lived API key with no privileges. The key is returned
 * once, when the record is created, and is never stored. When the stack reports back, Kibana
 * creates the cloud connector and stores its id here.
 */
export interface IacCallback extends Partial<IacCallbackReceivedValues>, IacCallbackIdentity {
  id: string;
  provider: 'aws';
  status: IacCallbackStatus;
  created_at: string;
  created_by?: string;
  /** Space the launch happened in. The record is space-agnostic because the stack calls Kibana without a space. */
  space_id?: string;
  expires_at: string;
  received_at?: string;
  /** Set when the stack's report has created the cloud connector. */
  cloud_connector_id?: string;
}
