/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { serializePrivileges } from './privileges_serializer';

test(`uses application as top-level key`, () => {
  const result = serializePrivileges('foo-application', {
    global: {},
    space: {},
    features: {},
    reserved: {},
  });
  expect(Object.keys(result)).toEqual(['foo-application']);
});

describe('global', () => {
  test(`includes global privileges without any prefix`, () => {
    const application = 'foo-application';
    const result = serializePrivileges(application, {
      global: {
        all: ['action-1', 'action-2'],
        read: ['action-3', 'action-4'],
      },
      space: {},
      features: {},
      reserved: {},
    });
    expect(result[application]).toEqual({
      all: {
        application,
        name: 'all',
        actions: ['action-1', 'action-2'],
        metadata: {},
      },
      read: {
        application,
        name: 'read',
        actions: ['action-3', 'action-4'],
        metadata: {},
      },
    });
  });

  test(`throws Error if unrecognized global privilege is specified`, () => {
    const application = 'foo-application';
    expect(() => {
      serializePrivileges(application, {
        global: {
          foo: ['action-1', 'action-2'],
        },
        space: {},
        features: {},
        reserved: {},
      });
    }).toThrowErrorMatchingSnapshot();
  });
});

describe('space', () => {
  test(`includes space privileges with a space_ prefix`, () => {
    const application = 'foo-application';
    const result = serializePrivileges(application, {
      global: {},
      space: {
        all: ['action-1', 'action-2'],
        read: ['action-3', 'action-4'],
      },
      features: {},
      reserved: {},
    });
    expect(result[application]).toEqual({
      space_all: {
        application,
        name: 'space_all',
        actions: ['action-1', 'action-2'],
        metadata: {},
      },
      space_read: {
        application,
        name: 'space_read',
        actions: ['action-3', 'action-4'],
        metadata: {},
      },
    });
  });

  test(`throws Error if unrecognized space privilege is specified`, () => {
    const application = 'foo-application';
    expect(() => {
      serializePrivileges(application, {
        global: {},
        space: {
          foo: ['action-1', 'action-2'],
        },
        features: {},
        reserved: {},
      });
    }).toThrowErrorMatchingSnapshot();
  });
});

describe('features', () => {
  test(`includes feature privileges by combining featureName and privilegeName with a feature_ prefix`, () => {
    const application = 'foo-application';
    const result = serializePrivileges(application, {
      global: {},
      space: {},
      features: {
        foo: {
          quz: ['action-1', 'action-2'],
          qux: ['action-3', 'action-4'],
        },
        bar: {
          quz: ['action-1', 'action-2'],
          qux: ['action-3', 'action-4'],
        },
      },
      reserved: {},
    });
    expect(result[application]).toEqual({
      'feature_foo.quz': {
        application,
        name: 'feature_foo.quz',
        actions: ['action-1', 'action-2'],
        metadata: {},
      },
      'feature_foo.qux': {
        application,
        name: 'feature_foo.qux',
        actions: ['action-3', 'action-4'],
        metadata: {},
      },
      'feature_bar.quz': {
        application,
        name: 'feature_bar.quz',
        actions: ['action-1', 'action-2'],
        metadata: {},
      },
      'feature_bar.qux': {
        application,
        name: 'feature_bar.qux',
        actions: ['action-3', 'action-4'],
        metadata: {},
      },
    });
  });

  test('features with no privileges are ignored', () => {
    const application = 'foo-application';
    const result = serializePrivileges(application, {
      global: {},
      space: {},
      features: {
        foo: {
          quz: ['action-1', 'action-2'],
          qux: ['action-3', 'action-4'],
        },
        bar: {},
      },
      reserved: {},
    });
    expect(result[application]).toEqual({
      'feature_foo.quz': {
        application,
        name: 'feature_foo.quz',
        actions: ['action-1', 'action-2'],
        metadata: {},
      },
      'feature_foo.qux': {
        application,
        name: 'feature_foo.qux',
        actions: ['action-3', 'action-4'],
        metadata: {},
      },
    });
  });

  test(`feature privileges don't conflict`, () => {
    const application = 'foo-application';
    serializePrivileges(application, {
      global: {},
      space: {},
      features: {
        foo_bar: {
          baz: ['action-1', 'action-2'],
        },
        foo: {
          bar_baz: ['action-1', 'action-2'],
        },
      },
      reserved: {},
    });
  });
});

describe('reserved', () => {
  test(`includes reserved privileges with a reserved_ prefix`, () => {
    const application = 'foo-application';
    const result = serializePrivileges(application, {
      global: {},
      space: {},
      features: {},
      reserved: {
        foo: ['action-1', 'action-2'],
        bar: ['action-3', 'action-4'],
      },
    });
    expect(result[application]).toEqual({
      reserved_foo: {
        application,
        name: 'reserved_foo',
        actions: ['action-1', 'action-2'],
        metadata: {},
      },
      reserved_bar: {
        application,
        name: 'reserved_bar',
        actions: ['action-3', 'action-4'],
        metadata: {},
      },
    });
  });
});
