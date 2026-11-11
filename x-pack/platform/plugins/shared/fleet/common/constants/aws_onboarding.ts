/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The packages the AWS onboarding flow can deploy. Kept in sync with the packages of the flow's
 * service matrix (`ingest_hub`), which a test there checks.
 */
export const AWS_ONBOARDING_PACKAGE_NAMES: readonly string[] = [
  'aws',
  'aws_bedrock',
  'aws_bedrock_agentcore',
  'aws_billing',
  'aws_cloudwatch_input_otel',
  'aws_logs',
  'aws_mq',
  'aws_securityhub',
  'amazon_security_lake',
  'awsfargate',
];
