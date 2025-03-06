/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserRt } from '../user/v1';

/**
 * This represents the push to service UserAction. It lacks the connector_id because that is stored in a different field
 * within the user action object in the API response.
 */
export const ExternalServiceBasicRt = rt.strict({
  connector_name: rt.string,
  external_id: rt.string,
  external_title: rt.string,
  external_url: rt.string,
  pushed_at: rt.string,
  pushed_by: UserRt,
});

export const ExternalServiceRt = rt.intersection([
  rt.strict({
    connector_id: rt.string,
  }),
  ExternalServiceBasicRt,
]);

export type ExternalService = rt.TypeOf<typeof ExternalServiceRt>;
