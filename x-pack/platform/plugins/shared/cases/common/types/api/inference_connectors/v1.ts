/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export type InferenceConnectorsResponse = rt.TypeOf<typeof InferenceConnectorsResponseRt>;

export const InferenceConnectorsRequestRt = rt.strict({});

export const InferenceConnectorsResponseRt = rt.exact(
  rt.partial({
    /**
     * List of inference connectors
     */
    connectors: rt.array(
      rt.strict({
        connectorId: rt.string,
      })
    ),
  })
);
