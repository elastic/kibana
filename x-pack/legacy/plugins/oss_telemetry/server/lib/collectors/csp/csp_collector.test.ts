/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { DEFAULT_CSP_RULES } from '../../../../../../../../src/legacy/server/csp';
import {
  getMockCallWithInternal,
  getMockKbnServer,
  getMockTaskFetch,
} from '../../../../test_utils';
import { createCspCollector } from './csp_collector';

test('fetches whether strict mode is enabled', async () => {
  const { collector, mockConfig } = setupCollector();

  expect((await collector.fetch()).strict).toEqual(true);

  mockConfig.get.withArgs('csp.strict').returns(false);
  expect((await collector.fetch()).strict).toEqual(false);
});

test('fetches whether the legacy browser warning is enabled', async () => {
  const { collector, mockConfig } = setupCollector();

  expect((await collector.fetch()).warnLegacyBrowsers).toEqual(true);

  mockConfig.get.withArgs('csp.warnLegacyBrowsers').returns(false);
  expect((await collector.fetch()).warnLegacyBrowsers).toEqual(false);
});

test('fetches whether the csp rules have been changed or not', async () => {
  const { collector, mockConfig } = setupCollector();

  expect((await collector.fetch()).rulesChangedFromDefault).toEqual(false);

  mockConfig.get.withArgs('csp.rules').returns(['not', 'default']);
  expect((await collector.fetch()).rulesChangedFromDefault).toEqual(true);
});

test('does not include raw csp.rules under any property names', async () => {
  const { collector } = setupCollector();

  // It's important that we do not send the value of csp.rules here as it
  // can be customized with values that can be identifiable to given
  // installs, such as URLs
  //
  // We use a snapshot here to ensure csp.rules isn't finding its way into the
  // payload under some new and unexpected variable name (e.g. cspRules).
  expect(await collector.fetch()).toMatchInlineSnapshot(`
    Object {
      "rulesChangedFromDefault": false,
      "strict": true,
      "warnLegacyBrowsers": true,
    }
  `);
});

test('does not arbitrarily fetch other csp configurations (e.g. whitelist only)', async () => {
  const { collector, mockConfig } = setupCollector();

  mockConfig.get.withArgs('csp.foo').returns('bar');

  expect(await collector.fetch()).not.toHaveProperty('foo');
});

function setupCollector() {
  const mockConfig = { get: sinon.stub() };
  mockConfig.get.withArgs('csp.rules').returns(DEFAULT_CSP_RULES);
  mockConfig.get.withArgs('csp.strict').returns(true);
  mockConfig.get.withArgs('csp.warnLegacyBrowsers').returns(true);

  const mockKbnServer = getMockKbnServer(getMockCallWithInternal(), getMockTaskFetch(), mockConfig);

  return { mockConfig, collector: createCspCollector(mockKbnServer) };
}
