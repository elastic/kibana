/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import type { ConfigFieldSchema, SecretsFieldSchema } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import * as i18n from './translations';

const WorkflowsConnectorFields: React.FunctionComponent<any> = () => {
  return (
    <EuiText size="s" color="subdued">
      {i18n.NO_CONFIGURATION_REQUIRED}
    </EuiText>
  );
};

// eslint-disable-next-line import/no-default-export
export default WorkflowsConnectorFields;

export const configFields: ConfigFieldSchema[] = [];

export const secretsFields: SecretsFieldSchema[] = [];
