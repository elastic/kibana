/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export const painlessErrReq = {
  params: {
    index: 'log*',
    body: {
      size: 500,
      fields: ['*'],
      script_fields: {
        invalid_scripted_field: {
          script: {
            source: 'invalid',
            lang: 'painless',
          },
        },
      },
      stored_fields: ['*'],
      query: {
        bool: {
          filter: [
            {
              match_all: {},
            },
            {
              range: {
                '@timestamp': {
                  gte: '2015-01-19T12:27:55.047Z',
                  lte: '2021-01-19T12:27:55.047Z',
                  format: 'strict_date_optional_time',
                },
              },
            },
          ],
        },
      },
    },
  },
};
