/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ExternalServiceBasicRt, ExternalServiceRt } from '../../external_service/v1';
import { UserActionTypes } from '../action/v1';

export const PushedUserActionPayloadWithoutConnectorIdRt = rt.strict({
  externalService: ExternalServiceBasicRt,
});

export const PushedUserActionPayloadRt = rt.strict({
  externalService: ExternalServiceRt,
});

export const PushedUserActionWithoutConnectorIdRt = rt.strict({
  type: rt.literal(UserActionTypes.pushed),
  payload: PushedUserActionPayloadWithoutConnectorIdRt,
});

export const PushedUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.pushed),
  payload: PushedUserActionPayloadRt,
});
