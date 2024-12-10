/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadActionErrorLog } from './load_action_error_log';

const http = httpServiceMock.createStartContract();

const mockResponse: any = {
  totalErrors: 12,
  errors: [
    {
      id: '66b9c04a-d5d3-4ed4-aa7c-94ddaca3ac1d',
      timestamp: '2022-03-31T18:03:33.133Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '14fcfe1c-5403-458f-8549-fa8ef59cdea3',
      timestamp: '2022-03-31T18:02:30.119Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: 'd53a401e-2a3a-4abe-8913-26e08a5039fd',
      timestamp: '2022-03-31T18:01:27.112Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '9cfeae08-24b4-4d5c-b870-a303418f14d6',
      timestamp: '2022-03-31T18:00:24.113Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '66b9c04a-d5d3-4ed4-aa7c-94ddaca3ac23',
      timestamp: '2022-03-31T18:03:21.133Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '14fcfe1c-5403-458f-8549-fa8ef59cde18',
      timestamp: '2022-03-31T18:02:18.119Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: 'd53a401e-2a3a-4abe-8913-26e08a503915',
      timestamp: '2022-03-31T18:01:15.112Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '9cfeae08-24b4-4d5c-b870-a303418f1412',
      timestamp: '2022-03-31T18:00:12.113Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '66b9c04a-d5d3-4ed4-aa7c-94ddaca3ac09',
      timestamp: '2022-03-31T18:03:09.133Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '14fcfe1c-5403-458f-8549-fa8ef59cde06',
      timestamp: '2022-03-31T18:02:06.119Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
  ],
};

describe('loadActionErrorLog', () => {
  test('should call load action error log API', async () => {
    http.get.mockResolvedValueOnce(mockResponse);

    const result = await loadActionErrorLog({
      id: 'test-id',
      dateStart: '2022-03-23T16:17:53.482Z',
      dateEnd: '2022-03-23T16:17:53.482Z',
      runId: '123',
      message: 'test',
      perPage: 10,
      page: 0,
      sort: [
        {
          timestamp: {
            order: 'asc',
          },
        },
      ],
      http,
    });

    expect(result).toEqual(mockResponse);

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/rule/test-id/_action_error_log",
        Object {
          "query": Object {
            "date_end": "2022-03-23T16:17:53.482Z",
            "date_start": "2022-03-23T16:17:53.482Z",
            "filter": "(message: \\"test\\" OR error.message: \\"test\\") and kibana.alert.rule.execution.uuid: 123",
            "namespace": undefined,
            "page": 1,
            "per_page": 10,
            "sort": "[{\\"@timestamp\\":{\\"order\\":\\"asc\\"}}]",
            "with_auth": false,
          },
        },
      ]
    `);
  });
});
