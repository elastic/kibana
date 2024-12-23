/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TinesRunActionParams } from '../../../common/tines/types';
import type { SUB_ACTION } from '../../../common/tines/constants';

export type TinesExecuteSubActionParams = Omit<Partial<TinesRunActionParams>, 'webhook'> & {
  webhook?: Partial<TinesRunActionParams['webhook']>;
};

export interface TinesExecuteActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: TinesExecuteSubActionParams;
}
