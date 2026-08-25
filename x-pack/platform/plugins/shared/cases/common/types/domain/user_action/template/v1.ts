/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserActionTypes } from '../action/v1';

export const TemplateUserActionPayloadRt = rt.strict({
  template: rt.union([
    // `name` is an optional point-in-time snapshot of the applied template's name so the activity
    // log can read "applied <name> template" without a lookup — durable if the template is later
    // renamed or deleted. Older user actions predate it, hence optional.
    rt.exact(
      rt.intersection([
        rt.type({
          id: rt.string,
          version: rt.number,
        }),
        rt.partial({
          name: rt.string,
        }),
      ])
    ),
    rt.null,
  ]),
});

export const TemplateUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.template),
  payload: TemplateUserActionPayloadRt,
});
