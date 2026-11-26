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
export type { AwsStaticKeyCredentials } from './aws_connect_setup/aws_static_keys_form';
export type { AwsTemporaryKeyCredentials } from './aws_connect_setup/aws_temporary_keys_form';
