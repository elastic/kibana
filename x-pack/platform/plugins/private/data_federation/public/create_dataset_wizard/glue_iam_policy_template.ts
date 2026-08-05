/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GLUE_IAM_POLICY_TEMPLATE = `{
  "Effect": "Allow",
  "Action": [
    "glue:GetTable",
    "glue:GetDatabase",
    "glue:GetPartitions"
  ],
  "Resource": [
    "arn:aws:glue:REGION:ACCOUNT_ID:catalog",
    "arn:aws:glue:REGION:ACCOUNT_ID:database/DATABASE_NAME",
    "arn:aws:glue:REGION:ACCOUNT_ID:table/DATABASE_NAME/TABLE_NAME"
  ]
}`;
