/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseUserActionConnectorRt, CaseConnectorRt } from '../../connector/v1';
import { UserActionTypes } from '../action/v1';

export const ConnectorUserActionPayloadWithoutConnectorIdRt = rt.strict({
  connector: CaseUserActionConnectorRt,
});

export const ConnectorUserActionPayloadRt = rt.strict({
  connector: CaseConnectorRt,
});

export const ConnectorUserActionWithoutConnectorIdRt = rt.strict({
  type: rt.literal(UserActionTypes.connector),
  payload: ConnectorUserActionPayloadWithoutConnectorIdRt,
});

export const ConnectorUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.connector),
  payload: ConnectorUserActionPayloadRt,
});
