/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  rotateInboundIngressParamsSchema,
  rotateInboundIngressResponseSchema,
} from './schemas/latest';
export type { RotateInboundIngressParams, RotateInboundIngressResponse } from './types/latest';

export {
  rotateInboundIngressParamsSchema as rotateInboundIngressParamsSchemaV1,
  rotateInboundIngressResponseSchema as rotateInboundIngressResponseSchemaV1,
} from './schemas/v1';
export type {
  RotateInboundIngressParams as RotateInboundIngressParamsV1,
  RotateInboundIngressResponse as RotateInboundIngressResponseV1,
} from './types/v1';
