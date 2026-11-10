/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryHistory } from 'history';
import { streamsAppRouter } from './config';

const at = (url: string) => createMemoryHistory({ initialEntries: [url] }).location;

const leaf = (url: string) => {
  const matches = streamsAppRouter.matchRoutes(at(url));
  return matches[matches.length - 1];
};

describe('streams app routes', () => {
  it.each(['unit', 'map', 'sources', 'destinations', 'indices', 'new-experience'])(
    'opens the legacy page for a classic stream named %s',
    (name) => {
      expect(leaf(`/${name}`).route.path).toBe('/{key}');
      expect(streamsAppRouter.getParams('/{key}', at(`/${name}`)).path.key).toBe(name);
    }
  );

  it('keeps deeper paths under a stream named unit on the legacy routes', () => {
    expect(leaf('/unit/management/overview').route.path).toBe('/{key}/management/{tab}');
    expect(leaf('/unit/default/map').route.path).toBe('/*');
  });

  it('reserves v2 for the V2 experience', () => {
    expect(leaf('/v2').route.path).toBe('/v2');
    expect(leaf('/v2/unit/edge').route.path).toBe('/v2/unit/{unitId}');
    expect(leaf('/v2/unit/edge/sources').route.path).toBe('/v2/unit/{unitId}/{tab}');
    expect(
      streamsAppRouter.getParams('/v2/unit/{unitId}/{tab}', at('/v2/unit/edge/sources')).path
    ).toEqual({ unitId: 'edge', tab: 'sources' });
  });

  it('keeps the time range next to the flyout params on unit routes', () => {
    expect(
      streamsAppRouter.getParams(
        '/v2/unit/{unitId}/{tab}',
        at('/v2/unit/edge/map?rangeFrom=now-1h&rangeTo=now&flyoutName=x')
      ).query
    ).toEqual({ rangeFrom: 'now-1h', rangeTo: 'now', flyoutName: 'x' });
  });

  it('keeps the unitId query param on both index routes', () => {
    const redirect = '/v2/indices/logs-a-b?rangeFrom=now-1h&unitId=edge';
    expect(leaf(redirect).route.path).toBe('/v2/indices/{indexName}');
    expect(streamsAppRouter.getParams('/v2/indices/{indexName}', at(redirect)).query).toEqual({
      rangeFrom: 'now-1h',
      unitId: 'edge',
    });
    const page = '/v2/indices/logs-a-b/retention?rangeFrom=now-1h&unitId=edge';
    expect(leaf(page).route.path).toBe('/v2/indices/{indexName}/{tab}');
    expect(streamsAppRouter.getParams('/v2/indices/{indexName}/{tab}', at(page)).query).toEqual({
      rangeFrom: 'now-1h',
      unitId: 'edge',
    });
  });
});
