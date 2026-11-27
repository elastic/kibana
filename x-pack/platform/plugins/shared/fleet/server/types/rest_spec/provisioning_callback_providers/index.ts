/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ObjectType, Type } from '@kbn/config-schema';

import type { CloudProvider } from '../../../../common/types/models/cloud_connector';
import type { CloudConnectorCallbackReport } from '../../../../common/types/models/provisioning_callback';

import { AwsReportSchema } from './aws';

/**
 * What a deployment of each provider reports to the receive route. Must match
 * `PROVISIONING_CALLBACK_PROVIDERS`, which the request schemas use, and the receivers the
 * service registers; tests keep them aligned.
 */
export const PROVISIONING_CALLBACK_REPORT_SCHEMAS: Partial<Record<CloudProvider, ObjectType>> = {
  aws: AwsReportSchema,
};

/**
 * The receive route's body: a report shaped for any provider with a shape. The record's own
 * provider decides which shape is actually accepted for it, in the service.
 */
export const provisioningCallbackReportSchema = (): Type<CloudConnectorCallbackReport> => {
  // `schema.oneOf` is typed per arity, so the members are folded in two at a time.
  const [first, ...rest] = Object.values(PROVISIONING_CALLBACK_REPORT_SCHEMAS) as Type<unknown>[];
  return rest.reduce(
    (union, next) => schema.oneOf([union, next]),
    first
  ) as Type<CloudConnectorCallbackReport>;
};
