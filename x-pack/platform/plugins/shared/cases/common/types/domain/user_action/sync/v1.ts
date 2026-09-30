/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserActionTypes } from '../action/v1';

/**
 * Recorded when the case is reconciled from its external incident.
 * `updated_fields` were applied; `conflicted_fields` were kept because the
 * case's conflict strategy favoured the Kibana value.
 */
export const SyncUserActionPayloadRt = rt.strict({
  sync: rt.intersection([
    rt.strict({
      connector_name: rt.string,
      external_id: rt.string,
      external_title: rt.string,
      external_url: rt.string,
      updated_fields: rt.array(rt.string),
      conflicted_fields: rt.array(rt.string),
    }),
    rt.exact(
      rt.partial({
        external_updated_at: rt.string,
        external_updated_by: rt.string,
      })
    ),
  ]),
});

export const SyncUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.sync),
  payload: SyncUserActionPayloadRt,
});
