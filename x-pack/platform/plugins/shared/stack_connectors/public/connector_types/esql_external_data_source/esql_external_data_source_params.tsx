/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { EsqlExternalDataSourceActionParams } from './esql_external_data_source';

const EsqlExternalDataSourceParamsFields: React.FC<
  ActionParamsProps<EsqlExternalDataSourceActionParams>
> = () => {
  return null;
};

// eslint-disable-next-line import/no-default-export
export default EsqlExternalDataSourceParamsFields;
