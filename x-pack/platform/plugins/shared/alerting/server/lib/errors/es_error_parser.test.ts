/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsErrorMessage } from './es_error_parser';

describe('ES error parser', () => {
  test('should return all the cause of the error', () => {
    expect(
      getEsErrorMessage({
        name: '',
        message: '',
        error: {
          meta: {
            body: {
              error: {
                caused_by: {
                  reason: 'reason1',
                },
              },
            },
          },
        },
      })
    ).toStrictEqual(', caused by: "reason1"');

    expect(
      getEsErrorMessage({
        name: '',
        message: '',
        meta: {
          body: {
            error: {
              caused_by: {
                reason: 'reason2',
              },
            },
          },
        },
      })
    ).toStrictEqual(', caused by: "reason2"');

    expect(
      getEsErrorMessage({
        name: '',
        message: '',
        meta: {
          body: {
            error: {
              caused_by: {
                reason: 'reason3',
                caused_by: {
                  reason: 'reason4',
                },
              },
            },
          },
        },
      })
    ).toStrictEqual(', caused by: "reason3,reason4"');

    expect(
      getEsErrorMessage({
        name: '',
        message: '',
        meta: {
          body: {
            error: {
              failed_shards: [
                {
                  reason: {
                    caused_by: {
                      reason: 'reason4',
                    },
                  },
                },
              ],
            },
          },
        },
      })
    ).toStrictEqual(', caused by: "reason4"');

    expect(
      getEsErrorMessage({
        name: '',
        message: '',
        meta: {
          body: {
            error: {
              failed_shards: [
                {
                  reason: {
                    caused_by: {
                      reason: 'reason5',
                      caused_by: {
                        reason: 'reason6',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      })
    ).toStrictEqual(', caused by: "reason5,reason6"');
  });
});
