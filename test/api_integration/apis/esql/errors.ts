/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import request from 'superagent';
import { inflateResponse } from '@kbn/bfetch-plugin/public/streaming';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { BFETCH_ROUTE_VERSION_LATEST } from '@kbn/bfetch-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

function parseBfetchResponse(resp: request.Response, compressed: boolean = false) {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => {
      return JSON.parse(compressed ? inflateResponse<any>(item) : item);
    });
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('error messages', () => {
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });
    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    const queryToErrors = [
      ['from missingIndex', 'Unknown index [missingIndex]'],
      [
        'from remote-*:indexes*',
        'ES|QL does not yet support querying remote indices [remote-*:indexes*]',
      ],
      [
        'from remote-*:indexes-1',
        'ES|QL does not yet support querying remote indices [remote-*:indexes-1]',
      ],
      ['row missing_column', 'Unknown column [missing_column]'],
      ['row fn()', 'Unknown function [fn]'],
      ['row a=1, b = average()', 'Unknown function [average]'],
      [
        'row var = 1 in ("a", "b", "c")',
        'Argument of [in] must be [number[]], found value [("a", "b", "c")] type [(string, string, string)]',
      ],
      ['row var = "a" > 0', `Argument of [>] must be [number], found value ["a"] type [string]`],
      [
        'row var = 5 like "?a"',
        'Argument of [like] must be [string], found value [5] type [number]',
      ],
      ['row 1 anno', 'Row does not support [date_period] in expression [1 anno]'],
      ['row var = 1 anno', "Unexpected time interval qualifier: 'anno'"],
      [
        'from logstash-2015.09.22 | rename s* as strings',
        'Using wildcards (*) in rename is not allowed [s*]',
      ],
      [
        'from logstash-2015.09.22 | dissect bytes "%{a}"',
        'Dissect only supports string type values, found [bytes] of type number',
      ],
      [
        'from logstash-2015.09.22 | dissect agent "%{a}" ignore_missing = true',
        'Invalid option for dissect: [ignore_missing]',
      ],
      [
        'from logstash-2015.09.22 | dissect agent "%{a}" append_separator = true',
        'Invalid value for dissect append_separator: expected a string, but was [true]',
      ],
      [
        'from logstash-2015.09.22 | grok bytes "%{NUMBER:bytes}"',
        'Grok only supports string type values, found [bytes] of type [number]',
      ],
      [
        'from logstash-2015.09.22 | where cidr_match(ip)',
        'Error building [cidr_match]: expects exactly 2 arguments, passed 1 instead.',
      ],
      [
        'from logstash-2015.09.22 | eval a=round(bytes) + round(agent), bytes',
        'Argument of [round] must be [number], found value [agent] type [string]',
      ],
      [
        'from logstash-2015.09.22 | eval 1 anno',
        'Eval does not support [date_period] in expression [1 anno]',
      ],
      [
        'from logstash-2015.09.22 | eval var = 1 anno',
        "Unexpected time interval qualifier: 'anno'",
      ],
      [
        'from logstash-2015.09.22 | stats bytes',
        'expected an aggregate function or group but got [bytes] of type [FieldAttribute]',
      ],
    ];
    for (const [query, errorMessage] of queryToErrors) {
      it(`Checking error message for: ${query} => ${errorMessage}`, async () => {
        const resp = await supertest
          .post(`/internal/bsearch`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    query,
                  },
                },
                options: {
                  strategy: 'esql',
                },
              },
            ],
          });

        const jsonBody = parseBfetchResponse(resp);

        // console.log(jsonBody);
        expect(resp.status).to.be(200);
        const message = jsonBody[0].error?.message
          ?.split('line ')?.[1]
          ?.split(':')?.[2]
          ?.trimStart();
        // Log some more details if the error message is not found
        if (message == null) {
          // eslint-disable-next-line no-console
          console.log(jsonBody);
        }
        expect(message).to.eql(errorMessage);
      });
    }
  });
}
