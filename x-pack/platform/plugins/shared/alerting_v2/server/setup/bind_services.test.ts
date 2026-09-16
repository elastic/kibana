/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Container, ContainerModule } from 'inversify';
import { Logger } from '@kbn/core-di';
import {
  CoreStart,
  PluginInitializer,
  Request,
  SavedObjectsClientFactory,
} from '@kbn/core-di-server';
import { coreMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { configSchema } from '../config';
import {
  EsServiceInternalToken,
  EsServiceScopedToken,
  EsServiceScopedSpaceRoutingToken,
} from '../lib/services/es_service/tokens';
import {
  QueryServiceScopedToken,
  QueryServiceScopedSpaceRoutingToken,
} from '../lib/services/query_service/tokens';
import { SpaceUiSettingsClientToken } from '../settings/tokens';
import { bindServices } from './bind_services';
import { CallerIdentityToken } from '../lib/rules_client/caller_identity';

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
    container
      .bind(PluginInitializer('config'))
      .toConstantValue(coreMock.createPluginInitializerContext(configSchema.validate({})).config);

    container.load(new ContainerModule((options) => bindServices(options)));
  });

  it('binds the internal client to asInternalUser (origin-only, local)', () => {
    expect(container.get(EsServiceInternalToken)).toBe(elasticsearch.client.asInternalUser);
    expect(elasticsearch.client.asScoped).not.toHaveBeenCalled();
  });

  it('binds the scoped client to asCurrentUser without project routing (local)', () => {
    const client = container.get(EsServiceScopedToken);

    expect(elasticsearch.client.asScoped).toHaveBeenCalledTimes(1);
    expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request);
    expect(client).toBe(elasticsearch.client.asScoped.mock.results[0].value.asCurrentUser);
  });

  it("binds the space-routed scoped client with projectRouting: 'space'", () => {
    const client = container.get(EsServiceScopedSpaceRoutingToken);

    expect(elasticsearch.client.asScoped).toHaveBeenCalledTimes(1);
    expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request, {
      projectRouting: 'space',
    });
    expect(client).toBe(elasticsearch.client.asScoped.mock.results[0].value.asCurrentUser);
  });

  it('wires the scoped QueryService to the origin-only (local) client', () => {
    container.get(QueryServiceScopedToken);

    expect(elasticsearch.client.asScoped).toHaveBeenCalledTimes(1);
    expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request);
  });

  it("wires the space-routed scoped QueryService with projectRouting: 'space'", () => {
    container.get(QueryServiceScopedSpaceRoutingToken);

    expect(elasticsearch.client.asScoped).toHaveBeenCalledTimes(1);
    expect(elasticsearch.client.asScoped).toHaveBeenCalledWith(request, {
      projectRouting: 'space',
    });
  });
});

describe('bindServices - SpaceUiSettingsClientToken', () => {
  it('scopes the client to the request, not the internal repository', async () => {
    const container = new Container();
    const request = httpServerMock.createKibanaRequest();
    const uiSettings = uiSettingsServiceMock.createStartContract();
    const scopedSoClient = savedObjectsClientMock.create();
    const savedObjectsClientFactory = jest.fn().mockReturnValue(scopedSoClient);

    container.bind(Logger).toConstantValue(loggingSystemMock.createLogger());
    container.bind(Request).toConstantValue(request);
    container
      .bind(CoreStart('elasticsearch'))
      .toConstantValue(elasticsearchServiceMock.createStart());
    container.bind(CoreStart('uiSettings')).toConstantValue(uiSettings);
    container.bind(SavedObjectsClientFactory).toConstantValue(savedObjectsClientFactory);
    container
      .bind(PluginInitializer('config'))
      .toConstantValue(coreMock.createPluginInitializerContext(configSchema.validate({})).config);

    container.load(new ContainerModule((options) => bindServices(options)));

    const client = await container.getAsync(SpaceUiSettingsClientToken);

    expect(savedObjectsClientFactory).toHaveBeenCalledWith();
    expect(uiSettings.asScopedToClient).toHaveBeenCalledWith(scopedSoClient);
    expect(client).toBe(uiSettings.asScopedToClient.mock.results[0].value);
  });
});

// ---------------------------------------------------------------------------
// bindServices - CallerIdentityToken default
//
// The default binding for CallerIdentityToken resolves to `undefined` so that
// framework HTTP routes (which take their rules client from the request scope
// without overriding the token) are identity-less by construction. The test
// pins this guarantee so that a future edit to bind_services that accidentally
// stamps an identity would be caught before landing.
//
// Ref: rule-ownership.md "Caller identity"
// ---------------------------------------------------------------------------

describe('bindServices - CallerIdentityToken default', () => {
  let container: Container;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(() => {
    container = new Container();
    const elasticsearch = elasticsearchServiceMock.createStart();
    request = httpServerMock.createKibanaRequest();

    container.bind(CoreStart('elasticsearch')).toConstantValue(elasticsearch);
    container.bind(Request).toConstantValue(request);
    container.bind(Logger).toConstantValue(loggingSystemMock.createLogger());
    container
      .bind(PluginInitializer('config'))
      .toConstantValue(coreMock.createPluginInitializerContext(configSchema.validate({})).config);

    container.load(new ContainerModule((options) => bindServices(options)));
  });

  it('resolves CallerIdentityToken to undefined in the request scope (no route stamps an identity)', () => {
    // bind_services defaults CallerIdentityToken to `undefined` so that every
    // framework HTTP route that resolves its RulesClient from the request scope
    // gets an identity-less client. The only way to get a non-undefined value is
    // to override it in `buildScope` via `getRulesClientWithRequest`'s
    // `onBehalfOf` option, which no framework route does.
    const identity = container.get(CallerIdentityToken);

    expect(identity).toBeUndefined();
  });
});
