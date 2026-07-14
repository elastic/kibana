/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import { Logger } from '@kbn/core-di';
import { CoreStart, Request } from '@kbn/core-di-server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  EsServiceInternalToken,
  EsServiceScopedToken,
  EsServiceScopedSpaceRoutingToken,
  TaskManagerEsClientsToken,
} from '../lib/services/es_service/tokens';
import {
  QueryServiceScopedToken,
  QueryServiceScopedSpaceRoutingToken,
} from '../lib/services/query_service/tokens';
import { bindServices } from './bind_services';

describe('bindServices - Elasticsearch client routing', () => {
  let container: Container;
  let elasticsearch: ReturnType<typeof elasticsearchServiceMock.createStart>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(() => {
    container = new Container();
    elasticsearch = elasticsearchServiceMock.createStart();
    request = httpServerMock.createKibanaRequest();

    container.bind(CoreStart('elasticsearch')).toConstantValue(elasticsearch);
    container.bind(Request).toConstantValue(request);
    container.bind(Logger).toConstantValue(loggingSystemMock.createLogger());

    container.loadSync(new ContainerModule((options) => bindServices(options)));
  });

  it('binds the internal client to asInternalUser (origin-only, local)', () => {
    expect(container.get(EsServiceInternalToken)).toBe(elasticsearch.client.asInternalUser);
    expect(elasticsearch.client.asScoped).not.toHaveBeenCalled();
  });

  describe('HTTP route path (request-scoped, no Task Manager)', () => {
    it('binds the scoped client to asCurrentUser without project routing (local)', () => {
      const client = container.get(EsServiceScopedToken);

      expect(elasticsearch.client.asScoped).toHaveBeenCalledTimes(1);
      expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request);
      expect(client).toBe(elasticsearch.client.asScoped.mock.results[0].value.asCurrentUser);
    });

    it('wires the scoped QueryService to the origin-only (local) client', () => {
      container.get(QueryServiceScopedToken);

      expect(elasticsearch.client.asScoped).toHaveBeenCalledTimes(1);
      expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request);
    });
  });

  describe('rule-executor task path (API-key clients built by Task Manager)', () => {
    let taskManagerEsClients: {
      scoped: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
      scopedWithSpaceRouting: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
    };

    beforeEach(() => {
      taskManagerEsClients = {
        scoped: elasticsearchServiceMock.createScopedClusterClient(),
        scopedWithSpaceRouting: elasticsearchServiceMock.createScopedClusterClient(),
      };
      container.bind(TaskManagerEsClientsToken).toConstantValue(taskManagerEsClients);
    });

    it('resolves the space-routed token from the Task Manager client and never scopes the request itself', () => {
      const client = container.get(EsServiceScopedSpaceRoutingToken);

      expect(client).toBe(taskManagerEsClients.scopedWithSpaceRouting.asCurrentUser);
      expect(elasticsearch.client.asScoped).not.toHaveBeenCalled();
    });

    it('wires the space-routed QueryService to the Task Manager client (no local asScoped call)', () => {
      container.get(QueryServiceScopedSpaceRoutingToken);

      expect(elasticsearch.client.asScoped).not.toHaveBeenCalled();
    });

    it('still builds the route-path scoped token from the request', () => {
      const client = container.get(EsServiceScopedToken);

      expect(elasticsearch.client.asScoped).toHaveBeenCalledTimes(1);
      expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request);
      expect(client).toBe(elasticsearch.client.asScoped.mock.results[0].value.asCurrentUser);
    });
  });

  describe('EsServiceScopedSpaceRoutingToken outside task execution', () => {
    it('throws because Task Manager did not provide the API-key clients', () => {
      expect(() => container.get(EsServiceScopedSpaceRoutingToken)).toThrow(
        'only available during task execution'
      );
      expect(elasticsearch.client.asScoped).not.toHaveBeenCalled();
    });
  });
});
