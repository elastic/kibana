/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  httpServerMock,
} from '@kbn/core/server/mocks';
import { alertsClientMock } from '@kbn/rule-registry-plugin/server/alert_data_client/alerts_client.mock';
import { CaseStatuses } from '../../../common/types/domain';
import { AlertService } from '.';
import { CasesEventBus } from '../../events/event_bus';

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

      expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
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

      expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
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

      expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
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

      expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
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

      expect(alertsClient.bulkUpdateCases).toHaveBeenCalledWith({ alerts, caseIds });
    });

    it('filters out alerts with empty id', async () => {
      await alertService.bulkUpdateCases({
        alerts: [{ id: '', index: 'test-index' }, ...alerts],
        caseIds,
      });

      expect(alertsClient.bulkUpdateCases).toHaveBeenCalledWith({ alerts, caseIds });
    });

    it('filters out alerts with empty index', async () => {
      await alertService.bulkUpdateCases({
        alerts: [{ id: 'test-id', index: '' }, ...alerts],
        caseIds,
      });

      expect(alertsClient.bulkUpdateCases).toHaveBeenCalledWith({ alerts, caseIds });
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

      expect(alertsClient.removeCaseIdFromAlerts).toHaveBeenCalledWith({ alerts, caseId });
    });

    it('filters out alerts with empty id', async () => {
      await alertService.removeCaseIdFromAlerts({
        alerts: [{ id: '', index: 'test-index' }, ...alerts],
        caseId,
      });

      expect(alertsClient.removeCaseIdFromAlerts).toHaveBeenCalledWith({ alerts, caseId });
    });

    it('filters out alerts with empty index', async () => {
      await alertService.removeCaseIdFromAlerts({
        alerts: [{ id: 'test-id', index: '' }, ...alerts],
        caseId,
      });

      expect(alertsClient.removeCaseIdFromAlerts).toHaveBeenCalledWith({ alerts, caseId });
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

      await expect(alertService.removeCaseIdFromAlerts({ alerts, caseId })).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed removing case test-case from alerts: An error'
      );
    });
  });

  describe('removeCaseIdsFromAllAlerts', () => {
    const caseIds = ['test-case-1', 'test-case-2'];

    it('remove all case ids from alerts', async () => {
      await alertService.removeCaseIdsFromAllAlerts({ caseIds });

      expect(alertsClient.removeCaseIdsFromAllAlerts).toHaveBeenCalledWith({ caseIds });
    });

    it('does not call the alerts client with no case ids', async () => {
      await alertService.removeCaseIdsFromAllAlerts({
        caseIds: [],
      });

      expect(alertsClient.removeCaseIdsFromAllAlerts).not.toHaveBeenCalled();
    });

    it('should not throw an error and log it', async () => {
      alertsClient.removeCaseIdsFromAllAlerts.mockRejectedValueOnce('An error');

      await expect(alertService.removeCaseIdsFromAllAlerts({ caseIds })).resolves.not.toThrow();

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

  describe('ensureAttacksAuthorized', () => {
    const ATTACK_INDEX = '.internal.alerts-security.attack.discovery.alerts-default-000001';
    const AD_HOC_ATTACK_INDEX =
      '.internal.adhoc.alerts-security.attack.discovery.alerts-default-000001';
    const ATTACK_PATTERN = '.alerts-security.attack.discovery.alerts-*';
    const AD_HOC_ATTACK_PATTERN = '.adhoc.alerts-security.attack.discovery.alerts-*';
    const attacks = [{ id: 'attack-1', index: ATTACK_INDEX }];
    const adHocAttacks = [{ id: 'attack-1', index: AD_HOC_ATTACK_INDEX }];

    const searchResponse = (
      hits: Array<{ _index: string; _id: string; _source?: Record<string, unknown> }>
    ) => ({ hits: { hits } });

    const attackDoc = (source: Record<string, unknown>) =>
      searchResponse([{ _index: ATTACK_INDEX, _id: 'attack-1', _source: source }]);

    const adHocAttackDoc = (source: Record<string, unknown>) =>
      searchResponse([{ _index: AD_HOC_ATTACK_INDEX, _id: 'attack-1', _source: source }]);

    const validAttackSource = {
      'kibana.alert.rule.rule_type_id': 'attack-discovery',
      'kibana.space_ids': ['default'],
    };

    const validAdHocAttackSource = {
      'kibana.alert.rule.rule_type_id': 'attack_discovery_ad_hoc_rule_type_id',
      'kibana.space_ids': ['default'],
    };

    it('authorizes an attack discovery alert in the current space', async () => {
      esClient.search.mockResolvedValueOnce(attackDoc(validAttackSource) as never);

      await expect(
        alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' })
      ).resolves.not.toThrow();

      expect(alertsClient.ensureAllAlertsAuthorizedRead).toHaveBeenCalledWith({ alerts: attacks });
    });

    it('reads through the alias pattern rather than the index on the attachment', async () => {
      esClient.search.mockResolvedValueOnce(attackDoc(validAttackSource) as never);

      await alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' });

      // Alert index privileges are granted on `.alerts-security.attack.discovery.alerts*` and
      // never on `.internal.alerts-*`, so reading the index the attachment carries would fail
      // for every non-superuser. A pattern rather than the alias, because single-document
      // operations against an alias break as soon as it spans more than one index.
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: ATTACK_PATTERN,
          query: { ids: { values: ['attack-1'] } },
          _source: ['kibana.alert.rule.rule_type_id', 'kibana.space_ids'],
        })
      );
      expect(esClient.mget).not.toHaveBeenCalled();
    });

    it('reads ad-hoc attacks through the ad-hoc pattern', async () => {
      esClient.search.mockResolvedValueOnce(adHocAttackDoc(validAdHocAttackSource) as never);

      await alertService.ensureAttacksAuthorized({ attacks: adHocAttacks, spaceId: 'default' });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: AD_HOC_ATTACK_PATTERN })
      );
    });

    it('groups a mixed batch into one search per index family', async () => {
      esClient.search
        .mockResolvedValueOnce(
          searchResponse([
            { _index: ATTACK_INDEX, _id: 'attack-1', _source: validAttackSource },
          ]) as never
        )
        .mockResolvedValueOnce(
          searchResponse([
            { _index: AD_HOC_ATTACK_INDEX, _id: 'attack-2', _source: validAdHocAttackSource },
          ]) as never
        );

      await expect(
        alertService.ensureAttacksAuthorized({
          attacks: [
            { id: 'attack-1', index: ATTACK_INDEX },
            { id: 'attack-2', index: AD_HOC_ATTACK_INDEX },
          ],
          spaceId: 'default',
        })
      ).resolves.not.toThrow();

      expect(esClient.search).toHaveBeenCalledTimes(2);
    });

    it('reads attacks from different backing indices of one family in a single search', async () => {
      esClient.search.mockResolvedValueOnce(
        searchResponse([
          { _index: ATTACK_INDEX, _id: 'attack-1', _source: validAttackSource },
          {
            _index: '.internal.alerts-security.attack.discovery.alerts-default-000002',
            _id: 'attack-2',
            _source: validAttackSource,
          },
        ]) as never
      );

      await expect(
        alertService.ensureAttacksAuthorized({
          attacks: [
            { id: 'attack-1', index: ATTACK_INDEX },
            {
              id: 'attack-2',
              index: '.internal.alerts-security.attack.discovery.alerts-default-000002',
            },
          ],
          spaceId: 'default',
        })
      ).resolves.not.toThrow();

      expect(esClient.search).toHaveBeenCalledTimes(1);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: ATTACK_PATTERN,
          size: 2,
          query: { ids: { values: ['attack-1', 'attack-2'] } },
        })
      );
    });

    it('authorizes an ad-hoc attack discovery alert in the current space', async () => {
      esClient.search.mockResolvedValueOnce(adHocAttackDoc(validAdHocAttackSource) as never);

      await expect(
        alertService.ensureAttacksAuthorized({ attacks: adHocAttacks, spaceId: 'default' })
      ).resolves.not.toThrow();

      // `attack_discovery_ad_hoc_rule_type_id` is a sentinel the alerting framework never
      // registers, so alerting RBAC cannot authorize it. The search above runs as the current
      // user, which is the index privilege gate ad-hoc discoveries are read with everywhere else.
      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('authorizes a dev-only data generator attack discovery alert in the current space', async () => {
      esClient.search.mockResolvedValueOnce(
        attackDoc({
          'kibana.alert.rule.rule_type_id': 'security.attack_discovery.data_generator',
          'kibana.space_ids': ['default'],
        }) as never
      );

      await expect(
        alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' })
      ).resolves.not.toThrow();

      // The generator rule writes through the same AAD config into the same index, so its
      // documents are attack discoveries. It is registered only in dev mode or on Elastic-owned
      // cloud, which is where the production gate lives. Rejecting these made the feature
      // untestable with the generator everyone desk tests with.
      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('sends only the scheduled attacks of a mixed batch through alerting RBAC', async () => {
      esClient.search.mockResolvedValueOnce(
        searchResponse([
          { _index: ATTACK_INDEX, _id: 'attack-1', _source: validAdHocAttackSource },
          { _index: ATTACK_INDEX, _id: 'attack-2', _source: validAttackSource },
        ]) as never
      );

      await expect(
        alertService.ensureAttacksAuthorized({
          attacks: [
            { id: 'attack-1', index: ATTACK_INDEX },
            { id: 'attack-2', index: ATTACK_INDEX },
          ],
          spaceId: 'default',
        })
      ).resolves.not.toThrow();

      expect(alertsClient.ensureAllAlertsAuthorizedRead).toHaveBeenCalledWith({
        alerts: [{ id: 'attack-2', index: ATTACK_INDEX }],
      });
    });

    it('pairs results to requests by id, not by the index Elasticsearch resolved', async () => {
      // The search is issued against a pattern and the hit carries the concrete backing index,
      // so the two never match. Comparing them would leave the scheduled set empty and skip
      // alerting RBAC for any caller that named something other than the backing index.
      esClient.search.mockResolvedValueOnce(
        searchResponse([
          {
            _index: '.internal.alerts-security.attack.discovery.alerts-default-000007',
            _id: 'attack-1',
            _source: validAttackSource,
          },
        ]) as never
      );

      await expect(
        alertService.ensureAttacksAuthorized({
          attacks: [{ id: 'attack-1', index: '.alerts-security.attack.discovery.alerts-default' }],
          spaceId: 'default',
        })
      ).resolves.not.toThrow();

      expect(alertsClient.ensureAllAlertsAuthorizedRead).toHaveBeenCalledWith({
        alerts: [
          {
            id: 'attack-1',
            index: '.internal.alerts-security.attack.discovery.alerts-default-000007',
          },
        ],
      });
    });

    it('authorizes the document the search resolved, not the index the attachment named', async () => {
      // `ensureAllAlertsAuthorizedRead` runs its own internal mget. The caller-supplied index need
      // not hold the document the search found, so forwarding it would run the alerting
      // permission check against a different document than the one whose rule type was read.
      esClient.search.mockResolvedValueOnce(
        searchResponse([
          {
            _index: '.internal.alerts-security.attack.discovery.alerts-default-000042',
            _id: 'attack-1',
            _source: validAttackSource,
          },
        ]) as never
      );

      await alertService.ensureAttacksAuthorized({
        attacks: [{ id: 'attack-1', index: ATTACK_INDEX }],
        spaceId: 'default',
      });

      expect(alertsClient.ensureAllAlertsAuthorizedRead).toHaveBeenCalledWith({
        alerts: [
          {
            id: 'attack-1',
            index: '.internal.alerts-security.attack.discovery.alerts-default-000042',
          },
        ],
      });
    });

    it('throws when an ad-hoc attack belongs to another space', async () => {
      esClient.search.mockResolvedValueOnce(
        adHocAttackDoc({
          'kibana.alert.rule.rule_type_id': 'attack_discovery_ad_hoc_rule_type_id',
          'kibana.space_ids': ['space-2'],
        }) as never
      );

      await expect(
        alertService.ensureAttacksAuthorized({ attacks: adHocAttacks, spaceId: 'default' })
      ).rejects.toThrow(/are not attack discoveries in space default: attack-1/);

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('throws when the referenced document does not exist', async () => {
      esClient.search.mockResolvedValueOnce(searchResponse([]) as never);

      await expect(
        alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' })
      ).rejects.toThrow(/Referenced attack\(s\) not found: attack-1/);

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('reports the attack as not found when the caller may not read the pattern', async () => {
      // A caller with no index privileges at all is refused the search instead of reading nothing.
      esClient.search.mockRejectedValueOnce({
        statusCode: 403,
        body: { error: { type: 'security_exception' } },
      } as never);

      await expect(
        alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' })
      ).rejects.toThrow(/Referenced attack\(s\) not found: attack-1/);

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('rethrows a read failure that is not an authorization refusal', async () => {
      esClient.search.mockRejectedValueOnce(
        Object.assign(new Error('unavailable_shards_exception'), {
          statusCode: 503,
          body: { error: { type: 'unavailable_shards_exception' } },
        }) as never
      );

      await expect(
        alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' })
      ).rejects.toThrow(/unavailable_shards_exception/);

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('throws when the referenced document is not an alert', async () => {
      esClient.search.mockResolvedValueOnce(attackDoc({ message: 'just a document' }) as never);

      await expect(
        alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' })
      ).rejects.toThrow(/are not attack discoveries in space default: attack-1/);

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('throws when the referenced alert is not an attack discovery', async () => {
      esClient.search.mockResolvedValueOnce(
        attackDoc({
          'kibana.alert.rule.rule_type_id': 'siem.queryRule',
          'kibana.space_ids': ['default'],
        }) as never
      );

      await expect(
        alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' })
      ).rejects.toThrow(/are not attack discoveries in space default: attack-1/);

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('throws when the referenced attack belongs to another space', async () => {
      esClient.search.mockResolvedValueOnce(
        attackDoc({
          'kibana.alert.rule.rule_type_id': 'attack-discovery',
          'kibana.space_ids': ['space-2'],
        }) as never
      );

      await expect(
        alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' })
      ).rejects.toThrow(/are not attack discoveries in space default: attack-1/);

      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('throws without reading when the index belongs to a linked project (CPS)', async () => {
      await expect(
        alertService.ensureAttacksAuthorized({
          attacks: [{ id: 'attack-1', index: `my-linked-project:${ATTACK_INDEX}` }],
          spaceId: 'default',
        })
      ).rejects.toThrow(/linked project or remote cluster/);

      expect(esClient.search).not.toHaveBeenCalled();
      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it.each([
      ['.alerts-security.alerts-default'],
      ['.internal.alerts-security.alerts-default-000001'],
      ['.kibana'],
      ['logs-*'],
    ])(
      'throws without reading when the index %s is not an attack discovery index',
      async (index) => {
        // Without this gate the read is pointed at any index the caller can read, and a document
        // there whose `_source` claims an attack discovery rule type in the right space would pass
        // every check that follows.
        await expect(
          alertService.ensureAttacksAuthorized({
            attacks: [{ id: 'attack-1', index }],
            spaceId: 'default',
          })
        ).rejects.toThrow(/not an attack discovery index/);

        expect(esClient.search).not.toHaveBeenCalled();
        expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
      }
    );

    it('does not read when there are no non-empty attacks', async () => {
      await expect(
        alertService.ensureAttacksAuthorized({
          attacks: [{ id: '', index: '' }],
          spaceId: 'default',
        })
      ).resolves.not.toThrow();

      expect(esClient.search).not.toHaveBeenCalled();
      expect(alertsClient.ensureAllAlertsAuthorizedRead).not.toHaveBeenCalled();
    });

    it('wraps and rethrows authorization errors', async () => {
      esClient.search.mockResolvedValueOnce(attackDoc(validAttackSource) as never);
      alertsClient.ensureAllAlertsAuthorizedRead.mockRejectedValueOnce(new Error('boom'));

      await expect(
        alertService.ensureAttacksAuthorized({ attacks, spaceId: 'default' })
      ).rejects.toThrow(/Failed to authorize attacks/);
    });
  });
});

describe('updateAlertsStatus — event bus', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.create().get('case');
  const alertsClient = alertsClientMock.create();
  const request = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-02-21T17:35:00Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('emits alertStatusChanged after updating statuses', async () => {
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'open' },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).toEqual(['a1']);
    expect(payload.status).toBe('closed');
    expect(payload.previousStatuses).toEqual([{ id: 'a1', previousStatus: 'open' }]);
    expect(payload.alertIdToIndex).toEqual({ a1: '.siem-signals' });
    expect(payload.indices).toEqual(['.siem-signals']);

    bus.removeAllListeners();
  });

  it('emits one event per distinct target status', async () => {
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    // a1 has previous status 'acknowledged' → target 'closed': actual change
    // a2 has previous status 'closed' → target 'open': actual change
    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'acknowledged' },
        },
        {
          found: true,
          _id: 'a2',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'closed' },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
      { id: 'a2', index: '.siem-signals', status: CaseStatuses.open },
    ]);

    // 'closed' maps to 'closed', 'open' maps to 'open' — two distinct target statuses
    expect(listener).toHaveBeenCalledTimes(2);

    bus.removeAllListeners();
  });

  it('does not emit when all alerts already have the target status', async () => {
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    // Both alerts already at 'closed' (the target)
    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'closed' },
        },
        {
          found: true,
          _id: 'a2',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'closed' },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
      { id: 'a2', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    expect(listener).not.toHaveBeenCalled();
    bus.removeAllListeners();
  });

  it('does not emit for alerts not found by the prefetch', async () => {
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    // Neither alert found by mget
    esClient.mget.mockResolvedValueOnce({ docs: [] } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    expect(listener).not.toHaveBeenCalled();
    bus.removeAllListeners();
  });

  it('logs warn and still completes update when mget prefetch fails', async () => {
    const bus = new CasesEventBus();
    // Listener must be registered so prefetch is attempted (hasAlertStatusChangedListeners() === true).
    bus.onAlertStatusChanged(jest.fn());
    esClient.mget.mockRejectedValue(new Error('mget failure'));

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    const updatePromise = alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
    ]);
    // pRetry schedules timer-based delays between retries; advance them all.
    await jest.runAllTimersAsync();
    await expect(updatePromise).resolves.not.toThrow();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to prefetch previous alert statuses')
    );
  });

  it('omits previousStatus entry for docs not found in prefetch (no fabricated open)', async () => {
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    // a1 is found with status 'acknowledged', a2 is not found
    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'acknowledged' },
        },
        { found: false, _id: 'a2' },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
      { id: 'a2', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    const { payload } = listener.mock.calls[0][0];
    expect(payload.previousStatuses).toEqual([{ id: 'a1', previousStatus: 'acknowledged' }]);
    // a2 is absent — not fabricated as 'open'
    expect(payload.previousStatuses.find((s: { id: string }) => s.id === 'a2')).toBeUndefined();

    bus.removeAllListeners();
  });

  it('emits with the affected ID but no previousStatuses row when the alert has an unrecognised previous status value', async () => {
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'triaged' },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    // The mutation succeeds; the event schema does not require a previousStatuses row per ID.
    expect(listener).toHaveBeenCalledTimes(1);
    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).toEqual(['a1']);
    expect(payload.previousStatuses).toEqual([]);

    bus.removeAllListeners();
  });

  it('does not emit for an alert with no workflow status field at all', async () => {
    // getUpdateAlertsStatusScript sets ctx.op = 'noop' when both kibana.alert.workflow_status
    // and signal.status are null/missing, so Elasticsearch performs no mutation. Emitting here
    // would start an external workflow for a status change that never happened.
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { 'some.other.field': 'value' },
        },
        {
          found: true,
          _id: 'a2',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'open' },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
      { id: 'a2', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).toEqual(['a2']);

    bus.removeAllListeners();
  });

  it('does not emit at all when every alert is status-less', async () => {
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    esClient.mget.mockResolvedValueOnce({
      docs: [{ found: true, _id: 'a1', _index: '.siem-signals', _source: {} }],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    expect(listener).not.toHaveBeenCalled();

    bus.removeAllListeners();
  });

  it('emits for an alert whose only status field is a non-null signal.status', async () => {
    // The legacy branch of the script mutates signal.status, so this doc does transition.
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { signal: { status: 'open' } },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).toEqual(['a1']);
    expect(payload.previousStatuses).toEqual([{ id: 'a1', previousStatus: 'open' }]);

    bus.removeAllListeners();
  });

  it('emits with the affected ID when unrecognized modern status coexists with a valid signal.status', async () => {
    // parseWorkflowStatus must not fall back to signal.status when the modern field is non-null.
    // Without the guard, signal.status 'closed' would equal the target and suppress the event,
    // even though the update script will mutate the non-null modern field from 'triaged' to 'closed'.
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'triaged', signal: { status: 'closed' } },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    const { payload } = listener.mock.calls[0][0];
    expect(payload.alertIds).toEqual(['a1']);
    expect(payload.previousStatuses).toEqual([]);

    bus.removeAllListeners();
  });

  it('treats same id with different indices as independent entries (composite key)', async () => {
    const bus = new CasesEventBus();
    const listener = jest.fn();
    bus.onAlertStatusChanged(listener);

    // 'a1' appears in two indices: security has it 'open' (change), observability has it 'closed' (no-op).
    // Without composite key, observability's 'closed' would overwrite security's 'open' in the map,
    // causing the security alert to be incorrectly treated as a no-op and suppressed.
    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.alerts-security.alerts-default',
          _source: { 'kibana.alert.workflow_status': 'open' },
        },
        {
          found: true,
          _id: 'a1',
          _index: '.alerts-observability.apm.alerts-default',
          _source: { 'kibana.alert.workflow_status': 'closed' },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.alerts-security.alerts-default', status: CaseStatuses.closed },
      { id: 'a1', index: '.alerts-observability.apm.alerts-default', status: CaseStatuses.closed },
    ]);

    // The security entry (open → closed) is an actual change and must emit.
    // The observability entry (closed → closed) is a no-op and must not.
    expect(listener).toHaveBeenCalledTimes(1);
    const { payload } = listener.mock.calls[0][0];
    expect(payload.previousStatuses).toEqual([{ id: 'a1', previousStatus: 'open' }]);

    bus.removeAllListeners();
  });

  it('still resolves successfully when a listener throws (listener isolation)', async () => {
    const bus = new CasesEventBus();
    bus.onAlertStatusChanged(() => {
      throw new Error('listener boom');
    });

    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'open' },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await expect(
      alertService.updateAlertsStatus([
        { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
      ])
    ).resolves.not.toThrow();

    bus.removeAllListeners();
  });

  it('does not call mget when no event bus is provided', async () => {
    const alertService = new AlertService(esClient, logger, alertsClient);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    expect(esClient.mget).not.toHaveBeenCalled();
  });

  it('does not call mget when event bus has no alertStatusChanged listeners', async () => {
    const bus = new CasesEventBus(); // no listener registered
    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await alertService.updateAlertsStatus([
      { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
    ]);

    expect(esClient.mget).not.toHaveBeenCalled();
    bus.removeAllListeners();
  });

  it('still resolves successfully when an async listener rejects (async listener isolation)', async () => {
    const bus = new CasesEventBus();
    bus.onAlertStatusChanged(async () => {
      throw new Error('async listener boom');
    });

    esClient.mget.mockResolvedValueOnce({
      docs: [
        {
          found: true,
          _id: 'a1',
          _index: '.siem-signals',
          _source: { 'kibana.alert.workflow_status': 'open' },
        },
      ],
    } as never);

    const alertService = new AlertService(esClient, logger, alertsClient, bus, request);
    await expect(
      alertService.updateAlertsStatus([
        { id: 'a1', index: '.siem-signals', status: CaseStatuses.closed },
      ])
    ).resolves.not.toThrow();
    // The rejection is swallowed in the onAlertStatusChanged wrapper (.catch(() => {})).
    // No setTimeout drain needed — the .catch is attached synchronously on the returned Promise.

    bus.removeAllListeners();
  });
});
