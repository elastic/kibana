/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UIActions } from './ui';

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((featureId: any) => {
    test(`featureId of ${JSON.stringify(featureId)} throws error`, () => {
      const uiActions = new UIActions();
      expect(() => uiActions.get(featureId, 'foo-capability')).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, '!'].forEach((uiCapability: any) => {
    test(`uiCapability of ${JSON.stringify(uiCapability)} throws error`, () => {
      const uiActions = new UIActions();
      expect(() => uiActions.get('foo', uiCapability)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `ui:${featureId}/${uiCapaility}`', () => {
    const uiActions = new UIActions();
    expect(uiActions.get('foo', 'foo-capability')).toBe('ui:foo/foo-capability');
  });

  test('returns `ui:${featureId}/${uiCapabilityPart}/${uiCapabilitySubPart}', () => {
    const uiActions = new UIActions();
    expect(uiActions.get('foo', 'fooCapability', 'subFoo')).toBe('ui:foo/fooCapability/subFoo');
  });
});

test('#isValid', () => {
  const uiActions = new UIActions();
  expect(uiActions.isValid('ui:alpha')).toBe(true);
  expect(uiActions.isValid('ui:beta')).toBe(true);

  expect(uiActions.isValid('api:alpha')).toBe(false);
  expect(uiActions.isValid('api:beta')).toBe(false);

  expect(uiActions.isValid('ui_alpha')).toBe(false);
  expect(uiActions.isValid('ui_beta')).toBe(false);
});
