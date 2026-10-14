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
 * Identity details the browser sends when it creates the callback so the Lambda's report can be
 * written straight onto a cloud connector. The Lambda never sends these.
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
 * back to Kibana. Kibana mints a short-lived, zero-privilege API key bound to the record; the
 * key itself is never stored and is returned exactly once, at creation. On receive, Kibana
 * creates the cloud connector and stores its id here.
 */
export interface IacCallback extends Partial<IacCallbackReceivedValues>, IacCallbackIdentity {
  id: string;
  provider: 'aws';
  status: IacCallbackStatus;
  created_at: string;
  created_by?: string;
  /** Space the launch happened in; the record itself is space-agnostic (the Lambda has no space). */
  space_id?: string;
  expires_at: string;
  received_at?: string;
  /** Set once receive has created the cloud connector for this launch. */
  cloud_connector_id?: string;
}
