/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type IacCallbackStatus = 'pending' | 'received' | 'cancelled';

/** What the stack's Lambda reports once the IAM role exists. */
export interface IacCallbackReceivedValues {
  role_arn: string;
  stack_arn: string;
  aws_account_id: string;
  region: string;
}

/**
 * A one-time record that lets a launched CloudFormation stack report its role ARN and stack ARN
 * back to Kibana. Kibana mints a short-lived, zero-privilege API key bound to the record; the
 * key itself is never stored and is returned exactly once, at creation.
 */
export interface IacCallback extends Partial<IacCallbackReceivedValues> {
  id: string;
  provider: 'aws';
  status: IacCallbackStatus;
  created_at: string;
  created_by?: string;
  /** Space the launch happened in; the record itself is space-agnostic (the Lambda has no space). */
  space_id?: string;
  expires_at: string;
  received_at?: string;
}
