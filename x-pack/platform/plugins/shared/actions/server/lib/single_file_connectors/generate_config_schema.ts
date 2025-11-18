/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { z as z4 } from '@kbn/zod/v4';

import type { ActionTypeConfig, ValidatorType } from '../../types';

export const generateConfigSchema = (
  schema: ConnectorSpec['schema']
): ValidatorType<ActionTypeConfig> => ({ schema: schema ?? z4.object({}) });
