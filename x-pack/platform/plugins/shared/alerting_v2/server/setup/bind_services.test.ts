/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { AsScopedOptions } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  EsServiceInternalToken,
  EsServiceScopedToken,
  EsServiceScopedSpaceRoutingToken,
} from '../lib/services/es_service/tokens';
import {
  QueryServiceScopedToken,
  QueryServiceScopedSpaceRoutingToken,
} from '../lib/services/query_service/tokens';
import { bindServices } from './bind_services';

const createClientMock = () =>
  ({
    esql: { query: jest.fn().mockResolvedValue({ columns: [], values: [] }) },
  } as unknown as ElasticsearchClient);

describe('bindServices - Elasticsearch client routing', () => {
  let container: Container;
  let fakeRequest: KibanaRequest;
  let asInternalUser: ElasticsearchClient;
  let scopedLocalCurrentUser: ElasticsearchClient;
  let scopedSpaceCurrentUser: ElasticsearchClient;
  let asScoped: jest.Mock;

  beforeEach(() => {
    container = new Container();
    fakeRequest = { headers: {} } as unknown as KibanaRequest;

    asInternalUser = createClientMock();
    scopedLocalCurrentUser = createClientMock();
    scopedSpaceCurrentUser = createClientMock();

    asScoped = jest.fn((_request: KibanaRequest, opts?: AsScopedOptions) => ({
      asCurrentUser:
        opts?.projectRouting === 'space' ? scopedSpaceCurrentUser : scopedLocalCurrentUser,
    }));

    container.bind(CoreStart('elasticsearch')).toConstantValue({
      client: { asScoped, asInternalUser },
    } as never);
    container.bind(Request).toConstantValue(fakeRequest);
    container.bind(Logger).toConstantValue(loggingSystemMock.createLogger());

    container.loadSync(new ContainerModule((options) => bindServices(options)));
  });

  it('binds the internal client to asInternalUser (origin-only, local)', () => {
    expect(container.get(EsServiceInternalToken)).toBe(asInternalUser);
    expect(asScoped).not.toHaveBeenCalled();
  });

  it('binds the scoped client to asCurrentUser without project routing (local)', () => {
    expect(container.get(EsServiceScopedToken)).toBe(scopedLocalCurrentUser);
    expect(asScoped).toHaveBeenCalledTimes(1);
    expect(asScoped).toHaveBeenCalledWith(fakeRequest);
  });

  it("binds the space-routed scoped client with projectRouting: 'space'", () => {
    expect(container.get(EsServiceScopedSpaceRoutingToken)).toBe(scopedSpaceCurrentUser);
    expect(asScoped).toHaveBeenCalledTimes(1);
    expect(asScoped).toHaveBeenCalledWith(fakeRequest, { projectRouting: 'space' });
  });

  it('wires the scoped QueryService to the origin-only (local) client', async () => {
    const queryService = container.get(QueryServiceScopedToken);

    await queryService.executeQuery({ query: 'FROM logs-*' });

    expect(asScoped).toHaveBeenCalledWith(fakeRequest);
    expect(scopedLocalCurrentUser.esql.query as jest.Mock).toHaveBeenCalledTimes(1);
    expect(scopedSpaceCurrentUser.esql.query as jest.Mock).not.toHaveBeenCalled();
  });

  it('wires the space-routed scoped QueryService to the space-routed client', async () => {
    const queryService = container.get(QueryServiceScopedSpaceRoutingToken);

    await queryService.executeQuery({ query: 'FROM logs-*' });

    expect(asScoped).toHaveBeenCalledWith(fakeRequest, { projectRouting: 'space' });
    expect(scopedSpaceCurrentUser.esql.query as jest.Mock).toHaveBeenCalledTimes(1);
    expect(scopedLocalCurrentUser.esql.query as jest.Mock).not.toHaveBeenCalled();
  });
});
