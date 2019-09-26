/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UIActions } from './ui';

const version = '1.0.0-zeta1';

describe('#all', () => {
  test('returns `ui:${version}:*`', () => {
    const uiActions = new UIActions(version);
    expect(uiActions.all).toBe('ui:1.0.0-zeta1:*');
  });
});

describe('#allNavlinks', () => {
  test('returns `ui:${version}:navLinks/*`', () => {
    const uiActions = new UIActions(version);
    expect(uiActions.allNavLinks).toBe('ui:1.0.0-zeta1:navLinks/*');
  });
});

describe('#allCatalogueEntries', () => {
  test('returns `ui:${version}:catalogue/*`', () => {
    const uiActions = new UIActions(version);
    expect(uiActions.allCatalogueEntries).toBe('ui:1.0.0-zeta1:catalogue/*');
  });
});

describe('#allManagmentLinks', () => {
  test('returns `ui:${version}:management/*`', () => {
    const uiActions = new UIActions(version);
    expect(uiActions.allManagmentLinks).toBe('ui:1.0.0-zeta1:management/*');
  });
});

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((featureId: any) => {
    test(`featureId of ${JSON.stringify(featureId)} throws error`, () => {
      const uiActions = new UIActions(version);
      expect(() => uiActions.get(featureId, 'foo-capability')).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, '!'].forEach((uiCapability: any) => {
    test(`uiCapability of ${JSON.stringify(uiCapability)} throws error`, () => {
      const uiActions = new UIActions(version);
      expect(() => uiActions.get('foo', uiCapability)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `ui:${version}:${featureId}/${uiCapaility}`', () => {
    const uiActions = new UIActions(version);
    expect(uiActions.get('foo', 'foo-capability')).toBe('ui:1.0.0-zeta1:foo/foo-capability');
  });

  test('returns `ui:${version}:${featureId}/${uiCapabilityPart}/${uiCapabilitySubPart}', () => {
    const uiActions = new UIActions(version);
    expect(uiActions.get('foo', 'fooCapability', 'subFoo')).toBe(
      'ui:1.0.0-zeta1:foo/fooCapability/subFoo'
    );
  });
});
