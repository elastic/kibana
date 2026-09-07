/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { alertsClientMock } from '@kbn/rule-registry-plugin/server/alert_data_client/alerts_client.mock';
import { CaseStatuses } from '../../../common/types/domain';
import { AlertService } from '.';

describe('updateAlertsStatus', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.create().get('case');
  const alertsClient = alertsClientMock.create();
  let alertService: AlertService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-02-21T17:35:00Z'));

    alertService = new AlertService(esClient, logger, alertsClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('happy path', () => {
    it('updates the status of the alert correctly', async () => {
      const args = [{ id: 'alert-id-1', index: '.siem-signals', status: CaseStatuses.closed }];

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": ".siem-signals",
            "query": Object {
              "ids": Object {
                "values": Array [
                  "alert-id-1",
                ],
              },
            },
            "script": Object {
              "lang": "painless",
              "params": Object {
                "reason": null,
                "shouldRemoveWorkflowReason": false,
                "status": "closed",
                "updatedAt": "2022-02-21T17:35:00.000Z",
              },
              "source": "
            boolean statusChanged = false;
            boolean signalStatusChanged = false;
            if (ctx._source['kibana.alert.workflow_status'] != null && ctx._source['kibana.alert.workflow_status'] != params.status) {
              statusChanged = true;
              ctx._source['kibana.alert.workflow_status'] = params.status;
              ctx._source['kibana.alert.workflow_status_updated_at'] = params.updatedAt;
              if (params.reason != null) {
                  ctx._source['kibana.alert.workflow_reason'] = params.reason;
              }
              if (params.shouldRemoveWorkflowReason) {
                ctx._source.remove('kibana.alert.workflow_reason');
              }
            }
            if (
              ctx._source.signal != null &&
              ctx._source.signal.status != null &&
              ctx._source.signal.status != params.status
            ) {
              signalStatusChanged = true;
              ctx._source.signal.status = params.status;
            }

            if (!statusChanged && !signalStatusChanged) {
              ctx.op = 'noop';
            }
          ",
            },
          },
        ]
      `);
    });

    it('returns total updated alert count', async () => {
      esClient.updateByQuery
        .mockResolvedValueOnce({ updated: 2, version_conflicts: 0 })
        .mockResolvedValueOnce({ updated: 1, version_conflicts: 1 });

      const result = await alertService.updateAlertsStatus([
        { id: 'id1', index: '1', status: CaseStatuses.closed },
        { id: 'id2', index: '1', status: CaseStatuses.closed },
        { id: 'id3', index: '1', status: CaseStatuses.open },
      ]);

      expect(result).toBe(3);
    });

    it('buckets the alerts by index', async () => {
      const args = [
        { id: 'id1', index: '1', status: CaseStatuses.closed },
        { id: 'id2', index: '1', status: CaseStatuses.closed },
      ];

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toBeCalledTimes(1);
      expect(esClient.updateByQuery.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "1",
            "query": Object {
              "ids": Object {
                "values": Array [
                  "id1",
                  "id2",
                ],
              },
            },
            "script": Object {
              "lang": "painless",
              "params": Object {
                "reason": null,
                "shouldRemoveWorkflowReason": false,
                "status": "closed",
                "updatedAt": "2022-02-21T17:35:00.000Z",
              },
              "source": "
            boolean statusChanged = false;
            boolean signalStatusChanged = false;
            if (ctx._source['kibana.alert.workflow_status'] != null && ctx._source['kibana.alert.workflow_status'] != params.status) {
              statusChanged = true;
              ctx._source['kibana.alert.workflow_status'] = params.status;
              ctx._source['kibana.alert.workflow_status_updated_at'] = params.updatedAt;
              if (params.reason != null) {
                  ctx._source['kibana.alert.workflow_reason'] = params.reason;
              }
              if (params.shouldRemoveWorkflowReason) {
                ctx._source.remove('kibana.alert.workflow_reason');
              }
            }
            if (
              ctx._source.signal != null &&
              ctx._source.signal.status != null &&
              ctx._source.signal.status != params.status
            ) {
              signalStatusChanged = true;
              ctx._source.signal.status = params.status;
            }

            if (!statusChanged && !signalStatusChanged) {
              ctx.op = 'noop';
            }
          ",
            },
          },
        ]
      `);
    });

    it('translates in-progress to acknowledged', async () => {
      const args = [{ id: 'id1', index: '1', status: CaseStatuses['in-progress'] }];

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toBeCalledTimes(1);
      expect(esClient.updateByQuery.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "1",
            "query": Object {
              "ids": Object {
                "values": Array [
                  "id1",
                ],
              },
            },
            "script": Object {
              "lang": "painless",
              "params": Object {
                "reason": null,
                "shouldRemoveWorkflowReason": true,
                "status": "acknowledged",
                "updatedAt": "2022-02-21T17:35:00.000Z",
              },
              "source": "
            boolean statusChanged = false;
            boolean signalStatusChanged = false;
            if (ctx._source['kibana.alert.workflow_status'] != null && ctx._source['kibana.alert.workflow_status'] != params.status) {
              statusChanged = true;
              ctx._source['kibana.alert.workflow_status'] = params.status;
              ctx._source['kibana.alert.workflow_status_updated_at'] = params.updatedAt;
              if (params.reason != null) {
                  ctx._source['kibana.alert.workflow_reason'] = params.reason;
              }
              if (params.shouldRemoveWorkflowReason) {
                ctx._source.remove('kibana.alert.workflow_reason');
              }
            }
            if (
              ctx._source.signal != null &&
              ctx._source.signal.status != null &&
              ctx._source.signal.status != params.status
            ) {
              signalStatusChanged = true;
              ctx._source.signal.status = params.status;
            }

            if (!statusChanged && !signalStatusChanged) {
              ctx.op = 'noop';
            }
          ",
            },
          },
        ]
      `);
    });

    it('makes two calls when the statuses are different', async () => {
      const args = [
        { id: 'id1', index: '1', status: CaseStatuses.closed },
        { id: 'id2', index: '1', status: CaseStatuses.open },
      ];

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toBeCalledTimes(2);
      // id1 should be closed
      expect(esClient.updateByQuery.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "1",
            "query": Object {
              "ids": Object {
                "values": Array [
                  "id1",
                ],
              },
            },
            "script": Object {
              "lang": "painless",
              "params": Object {
                "reason": null,
                "shouldRemoveWorkflowReason": false,
                "status": "closed",
                "updatedAt": "2022-02-21T17:35:00.000Z",
              },
              "source": "
            boolean statusChanged = false;
            boolean signalStatusChanged = false;
            if (ctx._source['kibana.alert.workflow_status'] != null && ctx._source['kibana.alert.workflow_status'] != params.status) {
              statusChanged = true;
              ctx._source['kibana.alert.workflow_status'] = params.status;
              ctx._source['kibana.alert.workflow_status_updated_at'] = params.updatedAt;
              if (params.reason != null) {
                  ctx._source['kibana.alert.workflow_reason'] = params.reason;
              }
              if (params.shouldRemoveWorkflowReason) {
                ctx._source.remove('kibana.alert.workflow_reason');
              }
            }
            if (
              ctx._source.signal != null &&
              ctx._source.signal.status != null &&
              ctx._source.signal.status != params.status
            ) {
              signalStatusChanged = true;
              ctx._source.signal.status = params.status;
            }

            if (!statusChanged && !signalStatusChanged) {
              ctx.op = 'noop';
            }
          ",
            },
          },
        ]
      `);

      // id2 should be open
      expect(esClient.updateByQuery.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          Object {
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "1",
            "query": Object {
              "ids": Object {
                "values": Array [
                  "id2",
                ],
              },
            },
            "script": Object {
              "lang": "painless",
              "params": Object {
                "reason": null,
                "shouldRemoveWorkflowReason": true,
                "status": "open",
                "updatedAt": "2022-02-21T17:35:00.000Z",
              },
              "source": "
            boolean statusChanged = false;
            boolean signalStatusChanged = false;
            if (ctx._source['kibana.alert.workflow_status'] != null && ctx._source['kibana.alert.workflow_status'] != params.status) {
              statusChanged = true;
              ctx._source['kibana.alert.workflow_status'] = params.status;
              ctx._source['kibana.alert.workflow_status_updated_at'] = params.updatedAt;
              if (params.reason != null) {
                  ctx._source['kibana.alert.workflow_reason'] = params.reason;
              }
              if (params.shouldRemoveWorkflowReason) {
                ctx._source.remove('kibana.alert.workflow_reason');
              }
            }
            if (
              ctx._source.signal != null &&
              ctx._source.signal.status != null &&
              ctx._source.signal.status != params.status
            ) {
              signalStatusChanged = true;
              ctx._source.signal.status = params.status;
            }

            if (!statusChanged && !signalStatusChanged) {
              ctx.op = 'noop';
            }
          ",
            },
          },
        ]
      `);
    });

    it('makes two calls when the indices are different', async () => {
      const args = [
        { id: 'id1', index: '1', status: CaseStatuses.closed },
        { id: 'id2', index: '2', status: CaseStatuses.open },
      ];

      await alertService.updateAlertsStatus(args);

      expect(esClient.updateByQuery).toBeCalledTimes(2);
      // id1 should be closed in index 1
      expect(esClient.updateByQuery.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "1",
            "query": Object {
              "ids": Object {
                "values": Array [
                  "id1",
                ],
              },
            },
            "script": Object {
              "lang": "painless",
              "params": Object {
                "reason": null,
                "shouldRemoveWorkflowReason": false,
                "status": "closed",
                "updatedAt": "2022-02-21T17:35:00.000Z",
              },
              "source": "
            boolean statusChanged = false;
            boolean signalStatusChanged = false;
            if (ctx._source['kibana.alert.workflow_status'] != null && ctx._source['kibana.alert.workflow_status'] != params.status) {
              statusChanged = true;
              ctx._source['kibana.alert.workflow_status'] = params.status;
              ctx._source['kibana.alert.workflow_status_updated_at'] = params.updatedAt;
              if (params.reason != null) {
                  ctx._source['kibana.alert.workflow_reason'] = params.reason;
              }
              if (params.shouldRemoveWorkflowReason) {
                ctx._source.remove('kibana.alert.workflow_reason');
              }
            }
            if (
              ctx._source.signal != null &&
              ctx._source.signal.status != null &&
              ctx._source.signal.status != params.status
            ) {
              signalStatusChanged = true;
              ctx._source.signal.status = params.status;
            }

            if (!statusChanged && !signalStatusChanged) {
              ctx.op = 'noop';
            }
          ",
            },
          },
        ]
      `);

      // id2 should be open in index 2
      expect(esClient.updateByQuery.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          Object {
            "conflicts": "abort",
            "ignore_unavailable": true,
            "index": "2",
            "query": Object {
              "ids": Object {
                "values": Array [
                  "id2",
                ],
              },
            },
            "script": Object {
              "lang": "painless",
              "params": Object {
                "reason": null,
                "shouldRemoveWorkflowReason": true,
                "status": "open",
                "updatedAt": "2022-02-21T17:35:00.000Z",
              },
              "source": "
            boolean statusChanged = false;
            boolean signalStatusChanged = false;
            if (ctx._source['kibana.alert.workflow_status'] != null && ctx._source['kibana.alert.workflow_status'] != params.status) {
              statusChanged = true;
              ctx._source['kibana.alert.workflow_status'] = params.status;
              ctx._source['kibana.alert.workflow_status_updated_at'] = params.updatedAt;
              if (params.reason != null) {
                  ctx._source['kibana.alert.workflow_reason'] = params.reason;
              }
              if (params.shouldRemoveWorkflowReason) {
                ctx._source.remove('kibana.alert.workflow_reason');
              }
            }
            if (
              ctx._source.signal != null &&
              ctx._source.signal.status != null &&
              ctx._source.signal.status != params.status
            ) {
              signalStatusChanged = true;
              ctx._source.signal.status = params.status;
            }

            if (!statusChanged && !signalStatusChanged) {
              ctx.op = 'noop';
            }
          ",
            },
          },
        ]
      `);
    });

    it('ignores empty indices', async () => {
      await alertService.updateAlertsStatus([
        { id: 'alert-id-1', index: '', status: CaseStatuses.open },
      ]);

      expect(esClient.updateByQuery).not.toHaveBeenCalled();
    });
  });

  describe('executeAggregations', () => {
    const aggregationBuilders = [
      {
        getName: () => 'hosts',
        build: () => ({ hosts_total: { cardinality: { field: 'host.id' } } }),
        formatResponse: () => ({}),
      },
    ];

    it('searches unique alert ids and indices with ignore_unavailable', async () => {
      const aggregations = { hosts_total: { value: 2 } };
      esClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { hits: [] },
        aggregations,
      });

      const res = await alertService.executeAggregations({
        aggregationBuilders,
        alerts: [
          { id: 'alert-1', index: '.alerts-security.alerts-default' },
          { id: 'alert-2', index: '.alerts-security.alerts-default' },
          { id: 'alert-3', index: '.alerts-observability.alerts-default' },
        ],
      });

      expect(esClient.search).toHaveBeenCalledWith({
        index: ['.alerts-security.alerts-default', '.alerts-observability.alerts-default'],
        ignore_unavailable: true,
        query: { ids: { values: ['alert-1', 'alert-2', 'alert-3'] } },
        size: 0,
        aggregations: { hosts_total: { cardinality: { field: 'host.id' } } },
      });
      expect(res).toEqual(aggregations);
    });
  });

  describe('getAlerts', () => {
    const docs = [
      {
        _index: '.internal.alerts-security.alerts-default-000001',
        _id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        _version: 2,
        _seq_no: 255,
        _primary_term: 1,
        found: true,
        _source: {
          destination: { mac: 'ff:ff:ff:ff:ff:ff' },
          source: { bytes: 444, mac: '11:1f:1e:13:15:14', packets: 6 },
          ecs: { version: '8.0.0' },
        },
      },
    ];

    esClient.mget.mockResolvedValue({ docs });

    it('returns the alerts correctly', async () => {
      const res = await alertService.getAlerts([
        {
          index: '.internal.alerts-security.alerts-default-000001',
          id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        },
      ]);

      expect(esClient.mget).toHaveBeenCalledWith({
        docs: [
          {
            _id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
            _index: '.internal.alerts-security.alerts-default-000001',
          },
        ],
      });

      expect(res).toEqual({ docs });
    });

    it('returns undefined if the id is empty', async () => {
      const res = await alertService.getAlerts([
        {
          index: '.internal.alerts-security.alerts-default-000001',
          id: '',
        },
      ]);

      expect(res).toBe(undefined);
    });

    it('returns undefined if the index is empty', async () => {
      const res = await alertService.getAlerts([
        {
          index: '',
          id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        },
      ]);

      expect(res).toBe(undefined);
    });
  });

  describe('bulkUpdateCases', () => {
    const alerts = [
      {
        id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        index: '.internal.alerts-security.alerts-default-000001',
      },
    ];
    const caseIds = ['test-case'];

    it('update case info', async () => {
      await alertService.bulkUpdateCases({ alerts, caseIds });

      expect(alertsClient.bulkUpdateCases).toBeCalledWith({ alerts, caseIds });
    });

    it('filters out alerts with empty id', async () => {
      await alertService.bulkUpdateCases({
        alerts: [{ id: '', index: 'test-index' }, ...alerts],
        caseIds,
      });

      expect(alertsClient.bulkUpdateCases).toBeCalledWith({ alerts, caseIds });
    });

    it('filters out alerts with empty index', async () => {
      await alertService.bulkUpdateCases({
        alerts: [{ id: 'test-id', index: '' }, ...alerts],
        caseIds,
      });

      expect(alertsClient.bulkUpdateCases).toBeCalledWith({ alerts, caseIds });
    });

    it('does not call the alerts client with no alerts', async () => {
      await alertService.bulkUpdateCases({
        alerts: [{ id: '', index: 'test-index' }],
        caseIds,
      });

      expect(alertsClient.bulkUpdateCases).not.toHaveBeenCalled();
    });
  });

  describe('removeCaseIdFromAlerts', () => {
    const alerts = [
      {
        id: 'c3869d546717e8c581add9cbf7d24578f34cd3e72cbc8d8b8e9a9330a899f70f',
        index: '.internal.alerts-security.alerts-default-000001',
      },
    ];
    const caseId = 'test-case';

    it('update case info', async () => {
      await alertService.removeCaseIdFromAlerts({ alerts, caseId });

      expect(alertsClient.removeCaseIdFromAlerts).toBeCalledWith({ alerts, caseId });
    });

    it('filters out alerts with empty id', async () => {
      await alertService.removeCaseIdFromAlerts({
        alerts: [{ id: '', index: 'test-index' }, ...alerts],
        caseId,
      });

      expect(alertsClient.removeCaseIdFromAlerts).toBeCalledWith({ alerts, caseId });
    });

    it('filters out alerts with empty index', async () => {
      await alertService.removeCaseIdFromAlerts({
        alerts: [{ id: 'test-id', index: '' }, ...alerts],
        caseId,
      });

      expect(alertsClient.removeCaseIdFromAlerts).toBeCalledWith({ alerts, caseId });
    });

    it('does not call the alerts client with no alerts', async () => {
      await alertService.removeCaseIdFromAlerts({
        alerts: [{ id: '', index: 'test-index' }],
        caseId,
      });

      expect(alertsClient.removeCaseIdFromAlerts).not.toHaveBeenCalled();
    });

    it('should not throw an error and log it', async () => {
      alertsClient.removeCaseIdFromAlerts.mockRejectedValueOnce('An error');

      await expect(
        alertService.removeCaseIdFromAlerts({ alerts, caseId })
      ).resolves.not.toThrowError();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed removing case test-case from alerts: An error'
      );
    });
  });

  describe('removeCaseIdsFromAllAlerts', () => {
    const caseIds = ['test-case-1', 'test-case-2'];

    it('remove all case ids from alerts', async () => {
      await alertService.removeCaseIdsFromAllAlerts({ caseIds });

      expect(alertsClient.removeCaseIdsFromAllAlerts).toBeCalledWith({ caseIds });
    });

    it('does not call the alerts client with no case ids', async () => {
      await alertService.removeCaseIdsFromAllAlerts({
        caseIds: [],
      });

      expect(alertsClient.removeCaseIdsFromAllAlerts).not.toHaveBeenCalled();
    });

    it('should not throw an error and log it', async () => {
      alertsClient.removeCaseIdsFromAllAlerts.mockRejectedValueOnce('An error');

      await expect(
        alertService.removeCaseIdsFromAllAlerts({ caseIds })
      ).resolves.not.toThrowError();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed removing cases test-case-1,test-case-2 for all alerts: An error'
      );
    });
  });

  describe('ensureAlertsAuthorized', () => {
    const alerts = [
      {
        id: 'alert-1',
        index: '.alerts-security.alerts-default',
      },
    ];

    it('authorizes local alerts', async () => {
      alertsClient.ensureAllAlertsAuthorizedRead.mockResolvedValueOnce(undefined);

      await expect(alertService.ensureAlertsAuthorized({ alerts })).resolves.not.toThrow();

      expect(alertsClient.ensureAllAlertsAuthorizedRead).toHaveBeenCalledWith({ alerts });
    });

    it('throws without calling ensureAllAlertsAuthorizedRead when the index belongs to a linked project (CPS)', async () => {
      await expect(
        alertService.ensureAlertsAuthorized({
          alerts: [{ id: 'alert-1', index: 'my-linked-project:.alerts-security.alerts-default' }],
        })
      ).rejects.toThrow(/linked project or remote cluster/);

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('throws without calling ensureAllAlertsAuthorizedRead when the index is a remote-cluster (CCS) reference', async () => {
      await expect(
        alertService.ensureAlertsAuthorized({
          alerts: [{ id: 'alert-1', index: 'my-remote-cluster:.alerts-security.alerts-default' }],
        })
      ).rejects.toThrow(/linked project or remote cluster/);

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('does not call ensureAllAlertsAuthorizedRead when there are no non-empty alerts', async () => {
      await expect(
        alertService.ensureAlertsAuthorized({ alerts: [{ id: '', index: '' }] })
      ).resolves.not.toThrow();

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('wraps and rethrows authorization errors', async () => {
      alertsClient.ensureAllAlertsAuthorizedRead.mockRejectedValueOnce(new Error('boom'));

      await expect(alertService.ensureAlertsAuthorized({ alerts })).rejects.toThrow(
        /Failed to authorize alerts/
      );
    });
  });

  describe('ensureDocumentsExist', () => {
    const alerts = [
      {
        id: 'event-1',
        index: '.ds-logs-endpoint.events.process-default',
      },
    ];

    it('does not throw when the document exists', async () => {
      esClient.mget.mockResolvedValueOnce({
        docs: [
          {
            _index: '.ds-logs-endpoint.events.process-default',
            _id: 'event-1',
            found: true,
            _source: {},
          },
        ],
      });

      await expect(alertService.ensureDocumentsExist({ alerts })).resolves.not.toThrow();
    });

    it('throws when the document is not found', async () => {
      esClient.mget.mockResolvedValueOnce({
        docs: [
          {
            _index: '.ds-logs-endpoint.events.process-default',
            _id: 'event-1',
            found: false,
          },
        ],
      });

      await expect(alertService.ensureDocumentsExist({ alerts })).rejects.toThrow(
        /Referenced event\(s\) not found: event-1/
      );
    });

    it('throws without calling mget when the index belongs to a linked project (CPS)', async () => {
      await expect(
        alertService.ensureDocumentsExist({
          alerts: [
            { id: 'event-1', index: 'my-linked-project:.ds-logs-endpoint.events.process-default' },
          ],
        })
      ).rejects.toThrow(/linked project or remote cluster/);

      expect(esClient.mget).not.toHaveBeenCalled();
    });

    it('throws without calling mget when the index is a remote-cluster (CCS) reference', async () => {
      await expect(
        alertService.ensureDocumentsExist({
          alerts: [
            { id: 'event-1', index: 'my-remote-cluster:.ds-logs-endpoint.events.process-default' },
          ],
        })
      ).rejects.toThrow(/linked project or remote cluster/);

      expect(esClient.mget).not.toHaveBeenCalled();
    });

    it('does not call mget when there are no non-empty alerts', async () => {
      await expect(
        alertService.ensureDocumentsExist({ alerts: [{ id: '', index: '' }] })
      ).resolves.not.toThrow();

      expect(esClient.mget).not.toHaveBeenCalled();
    });

    it('wraps and rethrows mget errors', async () => {
      esClient.mget.mockRejectedValueOnce(new Error('boom'));

      await expect(alertService.ensureDocumentsExist({ alerts })).rejects.toThrow(
        /Failed to verify referenced events exist/
      );
    });
  });
});
