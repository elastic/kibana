/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientMock } from '../../mocks';
import { createCasesClientMock } from '../../mocks';
import type { CasesClientArgs } from '../../types';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import { AlertDetails } from './details';
import { mockAlertsService } from '../test_utils/alerts';
import type { SingleCaseBaseHandlerCommonOptions, AggregationBuilder } from '../types';
import { CaseMetricsFeature } from '../../../../common/types/api';
import { createAttachmentServiceMock } from '../../../services/mocks';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { CASE_ATTACHMENT_SAVED_OBJECT, MAX_ALERTS_PER_CASE } from '../../../../common/constants';
import { getOwnersFilter } from '../../../authorization/utils';
import { AlertHosts, AlertUsers } from './aggregations';

const DISPLAY_LIMIT = 10;

const buildEntityAttachment = (id: string, entityName: string, entityType: 'user' | 'host') => ({
  id,
  type: 'cases-attachments',
  references: [],
  attributes: {
    type: SECURITY_ENTITY_ATTACHMENT_TYPE,
    attachmentId: `${entityType}:${entityName}@default`,
    metadata: { entityName, entityType },
    owner: 'securitySolution',
    created_at: '2020-01-01T00:00:00.000Z',
    created_by: { username: 'elastic', full_name: null, email: null },
    pushed_at: null,
    pushed_by: null,
    updated_at: null,
    updated_by: null,
  },
});

describe('AlertDetails', () => {
  let client: CasesClientMock;
  let mockServices: ReturnType<typeof createMockClientArgs>['mockServices'];
  let clientArgs: ReturnType<typeof createMockClientArgs>['clientArgs'];
  let constructorOptions: SingleCaseBaseHandlerCommonOptions;
  let attachmentService: ReturnType<typeof createAttachmentServiceMock>;
  let getAuthorizationFilter: jest.Mock;

  beforeEach(() => {
    client = createMockClient();
    ({ mockServices, clientArgs, attachmentService, getAuthorizationFilter } =
      createMockClientArgs());
    constructorOptions = { caseId: '', casesClient: client, clientArgs };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls getAllDocumentsAttachedToCase with alerts attachments filter', async () => {
    client.attachments.getAllDocumentsAttachedToCase.mockImplementation(async () => {
      return [];
    });

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);
    await handler.compute();

    expect(jest.mocked(client.attachments.getAllDocumentsAttachedToCase)).toHaveBeenCalledWith({
      attachmentTypes: ['alert'],
      caseId: '',
    });
    expect(attachmentService.getter.getUnifiedAttachmentsByTypes).toHaveBeenCalledWith({
      caseId: '',
      types: [SECURITY_ENTITY_ATTACHMENT_TYPE],
      filter: getOwnersFilter(CASE_ATTACHMENT_SAVED_OBJECT, ['securitySolution']),
    });
    expect(getAuthorizationFilter).toHaveBeenCalled();
  });

  it('fetches alerts and entity attachments concurrently rather than sequentially', async () => {
    let resolveAlerts: (
      value: Array<{ id: string; index: string; attached_at: string }>
    ) => void = () => {};
    client.attachments.getAllDocumentsAttachedToCase.mockReturnValue(
      new Promise((resolve) => {
        resolveAlerts = resolve;
      })
    );

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);
    const computePromise = handler.compute();

    // The entity attachment fetch shouldn't wait on the (still-pending) alerts fetch.
    await new Promise((resolve) => setImmediate(resolve));
    expect(attachmentService.getter.getUnifiedAttachmentsByTypes).toHaveBeenCalled();

    resolveAlerts([]);
    await computePromise;
  });

  it('returns empty alert details metrics when no features were setup', async () => {
    client.attachments.getAllDocumentsAttachedToCase.mockImplementation(async () => {
      return [{ id: '1', index: '2', attached_at: '3' }];
    });

    const handler = new AlertDetails(constructorOptions);
    expect(await handler.compute()).toEqual({});
    expect(attachmentService.getter.getUnifiedAttachmentsByTypes).not.toHaveBeenCalled();
  });

  it('returns empty alert details metrics when no features were setup when called twice', async () => {
    client.attachments.getAllDocumentsAttachedToCase.mockImplementation(async () => {
      return [{ id: '1', index: '2', attached_at: '3' }];
    });

    const handler = new AlertDetails(constructorOptions);
    expect(await handler.compute()).toEqual({});
    expect(await handler.compute()).toEqual({});
  });

  it('returns the default zero values when there are no alerts but features are requested', async () => {
    client.attachments.getAllDocumentsAttachedToCase.mockImplementation(async () => {
      return [];
    });

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 0,
          values: [],
        },
      },
    });
  });

  it('returns the default zero values for hosts when the count aggregation returns undefined', async () => {
    mockServices.services.alertsService.executeAggregations.mockImplementation(async () => ({}));

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 0,
          values: [],
        },
      },
    });
  });

  it('returns the default zero values for users when the count aggregation returns undefined', async () => {
    mockServices.services.alertsService.executeAggregations.mockImplementation(async () => ({}));

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);

    expect(await handler.compute()).toEqual({
      alerts: {
        users: {
          total: 0,
          values: [],
        },
      },
    });
  });

  it('returns host details when the host feature is setup', async () => {
    const handler = new AlertDetails(constructorOptions);

    handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 2,
          values: [{ id: '1', name: 'host1', count: 1 }],
        },
      },
    });
  });

  it('returns user details when the user feature is setup', async () => {
    const handler = new AlertDetails(constructorOptions);

    handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);

    expect(await handler.compute()).toEqual({
      alerts: {
        users: {
          total: 2,
          values: [{ name: 'user1', count: 1 }],
        },
      },
    });
  });

  it('returns user and host details when the user and host features are setup', async () => {
    const handler = new AlertDetails(constructorOptions);

    handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);
    handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 2,
          values: [{ id: '1', name: 'host1', count: 1 }],
        },
        users: {
          total: 2,
          values: [{ name: 'user1', count: 1 }],
        },
      },
    });
  });

  it('includes entity-only user attachments in associated users total', async () => {
    client.attachments.getAllDocumentsAttachedToCase.mockResolvedValue([]);
    attachmentService.getter.getUnifiedAttachmentsByTypes.mockResolvedValue([
      {
        id: 'entity-1',
        type: 'cases-attachments',
        references: [],
        attributes: {
          type: SECURITY_ENTITY_ATTACHMENT_TYPE,
          attachmentId: 'user:alice@default',
          metadata: { entityName: 'alice', entityType: 'user' },
          owner: 'securitySolution',
          created_at: '2020-01-01T00:00:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
      },
    ]);

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);

    expect(await handler.compute()).toEqual({
      alerts: {
        users: {
          total: 1,
          values: [{ name: 'alice', count: 1 }],
        },
      },
    });
  });

  it('includes entity-only host attachments in associated hosts total', async () => {
    client.attachments.getAllDocumentsAttachedToCase.mockResolvedValue([]);
    attachmentService.getter.getUnifiedAttachmentsByTypes.mockResolvedValue([
      {
        id: 'entity-1',
        type: 'cases-attachments',
        references: [],
        attributes: {
          type: SECURITY_ENTITY_ATTACHMENT_TYPE,
          attachmentId: 'host:web01@default',
          metadata: { entityName: 'web01', entityType: 'host' },
          owner: 'securitySolution',
          created_at: '2020-01-01T00:00:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
      },
    ]);

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

    expect(await handler.compute()).toEqual({
      alerts: {
        hosts: {
          total: 1,
          values: [{ id: 'host:web01@default', name: 'web01', count: 1 }],
        },
      },
    });
  });

  it('unions alert and entity user names without double counting', async () => {
    attachmentService.getter.getUnifiedAttachmentsByTypes.mockResolvedValue([
      {
        id: 'entity-1',
        type: 'cases-attachments',
        references: [],
        attributes: {
          type: SECURITY_ENTITY_ATTACHMENT_TYPE,
          attachmentId: 'user:user1@default',
          metadata: { entityName: 'user1', entityType: 'user' },
          owner: 'securitySolution',
          created_at: '2020-01-01T00:00:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
      },
      {
        id: 'entity-2',
        type: 'cases-attachments',
        references: [],
        attributes: {
          type: SECURITY_ENTITY_ATTACHMENT_TYPE,
          attachmentId: 'user:bob@default',
          metadata: { entityName: 'bob', entityType: 'user' },
          owner: 'securitySolution',
          created_at: '2020-01-01T00:00:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
      },
    ]);

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);

    // Alert mock: total 2 with values containing user1; entity adds bob and overlaps user1.
    expect(await handler.compute()).toEqual({
      alerts: {
        users: {
          total: 3,
          values: [
            { name: 'user1', count: 1 },
            { name: 'bob', count: 1 },
          ],
        },
      },
    });
  });

  it('does not count service or generic entity attachments toward users or hosts', async () => {
    client.attachments.getAllDocumentsAttachedToCase.mockResolvedValue([]);
    attachmentService.getter.getUnifiedAttachmentsByTypes.mockResolvedValue([
      {
        id: 'entity-1',
        type: 'cases-attachments',
        references: [],
        attributes: {
          type: SECURITY_ENTITY_ATTACHMENT_TYPE,
          attachmentId: 'service:nginx@default',
          metadata: { entityName: 'nginx', entityType: 'service' },
          owner: 'securitySolution',
          created_at: '2020-01-01T00:00:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
      },
      {
        id: 'entity-2',
        type: 'cases-attachments',
        references: [],
        attributes: {
          type: SECURITY_ENTITY_ATTACHMENT_TYPE,
          attachmentId: 'generic:thing@default',
          metadata: { entityName: 'thing', entityType: 'generic' },
          owner: 'securitySolution',
          created_at: '2020-01-01T00:00:00.000Z',
          created_by: { username: 'elastic', full_name: null, email: null },
          pushed_at: null,
          pushed_by: null,
          updated_at: null,
          updated_by: null,
        },
      },
    ]);

    const handler = new AlertDetails(constructorOptions);
    handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);
    handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

    expect(await handler.compute()).toEqual({
      alerts: {
        users: { total: 0, values: [] },
        hosts: { total: 0, values: [] },
      },
    });
  });

  describe('aggregation widening', () => {
    const getBuiltAggregationSizes = () => {
      const { aggregationBuilders } = mockServices.services.alertsService.executeAggregations.mock
        .calls[0][0] as { aggregationBuilders: Array<AggregationBuilder<unknown>> };

      const usersBuilder = aggregationBuilders.find((builder) => builder instanceof AlertUsers);
      const hostsBuilder = aggregationBuilders.find((builder) => builder instanceof AlertHosts);

      return {
        users: (usersBuilder?.build() as { users_frequency: { terms: { size: number } } })
          ?.users_frequency.terms.size,
        hosts: (hostsBuilder?.build() as { hosts_frequency: { terms: { size: number } } })
          ?.hosts_frequency.terms.size,
      };
    };

    it('keeps the display-limit-sized aggregations when there are no entity attachments', async () => {
      const handler = new AlertDetails(constructorOptions);
      handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);
      handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

      await handler.compute();

      expect(getBuiltAggregationSizes()).toEqual({ users: DISPLAY_LIMIT, hosts: DISPLAY_LIMIT });
    });

    it('widens only the users aggregation when there are only user entity attachments', async () => {
      attachmentService.getter.getUnifiedAttachmentsByTypes.mockResolvedValue([
        buildEntityAttachment('entity-1', 'alice', 'user'),
      ]);

      const handler = new AlertDetails(constructorOptions);
      handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);
      handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

      await handler.compute();

      expect(getBuiltAggregationSizes()).toEqual({
        users: MAX_ALERTS_PER_CASE,
        hosts: DISPLAY_LIMIT,
      });
    });

    it('widens only the hosts aggregation when there are only host entity attachments', async () => {
      attachmentService.getter.getUnifiedAttachmentsByTypes.mockResolvedValue([
        buildEntityAttachment('entity-1', 'web01', 'host'),
      ]);

      const handler = new AlertDetails(constructorOptions);
      handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);
      handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

      await handler.compute();

      expect(getBuiltAggregationSizes()).toEqual({
        users: DISPLAY_LIMIT,
        hosts: MAX_ALERTS_PER_CASE,
      });
    });

    it('widens both aggregations when there are both user and host entity attachments', async () => {
      attachmentService.getter.getUnifiedAttachmentsByTypes.mockResolvedValue([
        buildEntityAttachment('entity-1', 'alice', 'user'),
        buildEntityAttachment('entity-2', 'web01', 'host'),
      ]);

      const handler = new AlertDetails(constructorOptions);
      handler.setupFeature(CaseMetricsFeature.ALERTS_USERS);
      handler.setupFeature(CaseMetricsFeature.ALERTS_HOSTS);

      await handler.compute();

      expect(getBuiltAggregationSizes()).toEqual({
        users: MAX_ALERTS_PER_CASE,
        hosts: MAX_ALERTS_PER_CASE,
      });
    });
  });
});

function createMockClient() {
  const client = createCasesClientMock();
  client.attachments.getAllDocumentsAttachedToCase.mockImplementation(async () => {
    return [{ id: '1', index: '2', attached_at: '3' }];
  });

  return client;
}

function createMockClientArgs() {
  const alertsService = mockAlertsService();
  const attachmentService = createAttachmentServiceMock();
  attachmentService.getter.getUnifiedAttachmentsByTypes.mockResolvedValue([]);

  const logger = loggingSystemMock.createLogger();
  const getAuthorizationFilter = jest.fn().mockResolvedValue({
    authorizedOwners: ['securitySolution'],
  });

  const clientArgs = {
    logger,
    authorization: {
      getAuthorizationFilter,
    },
    services: {
      alertsService,
      attachmentService,
    },
  };

  return {
    mockServices: clientArgs,
    clientArgs: clientArgs as unknown as CasesClientArgs,
    attachmentService,
    getAuthorizationFilter,
  };
}
