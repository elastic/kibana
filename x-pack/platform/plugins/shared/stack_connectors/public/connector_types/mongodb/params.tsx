/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { ActionParamsProps } from '@kbn/alerts-ui-shared';

interface MongoActionParams {
  subAction?: string;
  subActionParams?: Record<string, unknown>;
}

const ParamsFields: React.FC<ActionParamsProps<MongoActionParams>> = () => {
  return null;
};

// eslint-disable-next-line import/no-default-export
export default ParamsFields;
