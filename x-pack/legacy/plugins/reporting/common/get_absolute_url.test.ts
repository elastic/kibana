/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../test_helpers/create_mock_server';
import { getAbsoluteUrlFactory } from './get_absolute_url';

test(`by default it builds url using information from server.info.protocol and the server.config`, () => {
  const mockServer = createMockServer('');
  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const absoluteUrl = getAbsoluteUrl();
  expect(absoluteUrl).toBe(`http://localhost:5601/sbp/app/kibana`);
});

test(`uses kibanaServer.protocol if specified`, () => {
  const settings = {
    'xpack.reporting.kibanaServer.protocol': 'https',
  };
  const mockServer = createMockServer({ settings });

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const absoluteUrl = getAbsoluteUrl();
  expect(absoluteUrl).toBe(`https://localhost:5601/sbp/app/kibana`);
});

test(`uses kibanaServer.hostname if specified`, () => {
  const settings = {
    'xpack.reporting.kibanaServer.hostname': 'something-else',
  };
  const mockServer = createMockServer({ settings });

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const absoluteUrl = getAbsoluteUrl();
  expect(absoluteUrl).toBe(`http://something-else:5601/sbp/app/kibana`);
});

test(`uses kibanaServer.port if specified`, () => {
  const settings = {
    'xpack.reporting.kibanaServer.port': 8008,
  };
  const mockServer = createMockServer({ settings });

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const absoluteUrl = getAbsoluteUrl();
  expect(absoluteUrl).toBe(`http://localhost:8008/sbp/app/kibana`);
});

test(`uses the provided hash`, () => {
  const mockServer = createMockServer('');

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const hash = '/hash';
  const absoluteUrl = getAbsoluteUrl({ hash });
  expect(absoluteUrl).toBe(`http://localhost:5601/sbp/app/kibana#${hash}`);
});

test(`uses the provided hash with queryString`, () => {
  const mockServer = createMockServer('');

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const hash = '/hash?querystring';
  const absoluteUrl = getAbsoluteUrl({ hash });
  expect(absoluteUrl).toBe(`http://localhost:5601/sbp/app/kibana#${hash}`);
});

test(`uses the provided basePath`, () => {
  const mockServer = createMockServer('');

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const absoluteUrl = getAbsoluteUrl({ basePath: '/s/marketing' });
  expect(absoluteUrl).toBe(`http://localhost:5601/s/marketing/app/kibana`);
});

test(`uses the path`, () => {
  const mockServer = createMockServer('');

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const path = '/app/canvas';
  const absoluteUrl = getAbsoluteUrl({ path });
  expect(absoluteUrl).toBe(`http://localhost:5601/sbp${path}`);
});

test(`uses the search`, () => {
  const mockServer = createMockServer('');

  const getAbsoluteUrl = getAbsoluteUrlFactory(mockServer);
  const search = '_t=123456789';
  const absoluteUrl = getAbsoluteUrl({ search });
  expect(absoluteUrl).toBe(`http://localhost:5601/sbp/app/kibana?${search}`);
});
