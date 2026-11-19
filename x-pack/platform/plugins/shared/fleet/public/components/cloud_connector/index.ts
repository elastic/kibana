/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { CloudConnectorSetup, type CloudConnectorSetupProps } from './cloud_connector_setup';
export {
  CloudConnectorTabs,
  type CloudConnectorTab,
  type CloudConnectorTabsProps,
} from './cloud_connector_tabs';
export type { UpdatePolicy, CloudConnectorCredentials, CloudSetupForCloudConnector } from './types';
export {
  AwsConnectSetup,
  type AwsConnectSetupProps,
  type AwsAuthType,
  type AwsStaticKeyCredentials,
  type AwsTemporaryKeyCredentials,
} from './aws_connect_setup';
export { AwsAuthTypeSelector } from './aws_connect_setup/aws_auth_type_selector';
export {
  AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ,
  AWS_AUTH_TYPE_IF_CARD_TEST_SUBJ,
  AWS_AUTH_TYPE_STATIC_KEYS_CARD_TEST_SUBJ,
  AWS_AUTH_TYPE_TEMPORARY_KEYS_CARD_TEST_SUBJ,
} from './aws_connect_setup/test_subjects';
