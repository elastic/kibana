/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const ExternalServiceResponseRt = rt.intersection([
  rt.strict({
    title: rt.string,
    id: rt.string,
    pushedDate: rt.string,
    url: rt.string,
  }),
  rt.exact(
    rt.partial({
      comments: rt.array(
        rt.intersection([
          rt.strict({
            commentId: rt.string,
            pushedDate: rt.string,
          }),
          rt.exact(rt.partial({ externalCommentId: rt.string })),
        ])
      ),
    })
  ),
]);

export type ExternalServiceResponse = rt.TypeOf<typeof ExternalServiceResponseRt>;
