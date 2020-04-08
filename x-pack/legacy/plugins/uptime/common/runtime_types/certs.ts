/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const CertElasticsearchResponse = t.type({
  hits: t.type({
    hits: t.array(
      t.type({
        _source: t.type({
          tls: t.partial({
            certificate_not_valid_before: t.string,
            issued_by: t.string,
            sha256: t.string,
            common_name: t.string,
            certificate_not_valid_after: t.string,
          }),
        }),
        inner_hits: t.type({
          monitors: t.type({
            hits: t.type({
              hits: t.array(
                t.partial({
                  _source: t.type({
                    monitor: t.type({
                      name: t.string,
                      id: t.string,
                    }),
                  }),
                })
              ),
            }),
          }),
        }),
      })
    ),
  }),
});

export const CertType = t.intersection([
  t.type({
    monitors: t.array(
      t.partial({
        name: t.string,
        id: t.string,
      })
    ),
  }),
  t.partial({
    certificate_not_valid_after: t.string,
    certificate_not_valid_before: t.string,
    common_name: t.string,
    issued_by: t.string,
    sha256: t.string,
  }),
]);

export type Cert = t.TypeOf<typeof CertType>;
