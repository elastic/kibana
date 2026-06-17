/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFeature } from '@kbn/features-plugin/server';

import { validateFeaturePrivileges } from './validate_feature_privileges';

it('allows features to be defined without privileges', () => {
  const feature: KibanaFeature = new KibanaFeature({
    id: 'foo',
    name: 'foo',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: null,
  });

  validateFeaturePrivileges([feature]);
});

it('allows features with reserved privileges to be defined', () => {
  const feature: KibanaFeature = new KibanaFeature({
    id: 'foo',
    name: 'foo',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: null,
    reserved: {
      description: 'foo',
      privileges: [
        {
          id: 'reserved',
          privilege: {
            savedObject: {
              all: ['foo'],
              read: ['bar'],
            },
            ui: [],
          },
        },
      ],
    },
  });

  validateFeaturePrivileges([feature]);
});

it('allows features with sub-features to be defined', () => {
  const feature: KibanaFeature = new KibanaFeature({
    id: 'foo',
    name: 'foo',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: {
      all: {
        savedObject: {
          all: ['foo'],
          read: ['bar'],
        },
        ui: [],
      },
      read: {
        savedObject: {
          all: ['foo'],
          read: ['bar', 'baz'],
        },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: 'sub-feature-1',
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'sub-feature-1-priv-1',
                name: 'some sub feature',
                includeIn: 'all',
                savedObject: {
                  all: ['foo'],
                  read: ['bar', 'baz'],
                },
                ui: [],
              },
            ],
          },
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'sub-feature-1-priv-2',
                name: 'some second sub feature',
                includeIn: 'none',
                savedObject: {
                  all: ['foo', 'bar'],
                  read: ['baz'],
                },
                ui: [],
              },
            ],
          },
        ],
      },
    ],
  });

  validateFeaturePrivileges([feature]);
});

it('does not allow features with sub-features which have id conflicts with the minimal privileges', () => {
  const feature: KibanaFeature = new KibanaFeature({
    id: 'foo',
    name: 'foo',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: {
      all: {
        savedObject: {
          all: ['foo'],
          read: ['bar'],
        },
        ui: [],
      },
      read: {
        savedObject: {
          all: ['foo'],
          read: ['bar', 'baz'],
        },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: 'sub-feature-1',
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'minimal_all',
                name: 'some sub feature',
                includeIn: 'all',
                savedObject: {
                  all: ['foo'],
                  read: ['bar', 'baz'],
                },
                ui: [],
              },
            ],
          },
        ],
      },
    ],
  });

  expect(() => validateFeaturePrivileges([feature])).toThrowErrorMatchingInlineSnapshot(
    `"KibanaFeature 'foo' already has a privilege with ID 'minimal_all'. Sub feature 'sub-feature-1' cannot also specify this."`
  );
});

it('does not allow features with sub-features which have id conflicts with the primary feature privileges', () => {
  const feature: KibanaFeature = new KibanaFeature({
    id: 'foo',
    name: 'foo',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: {
      all: {
        savedObject: {
          all: ['foo'],
          read: ['bar'],
        },
        ui: [],
      },
      read: {
        savedObject: {
          all: ['foo'],
          read: ['bar', 'baz'],
        },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: 'sub-feature-1',
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'read',
                name: 'some sub feature',
                includeIn: 'all',
                savedObject: {
                  all: ['foo'],
                  read: ['bar', 'baz'],
                },
                ui: [],
              },
            ],
          },
        ],
      },
    ],
  });

  expect(() => validateFeaturePrivileges([feature])).toThrowErrorMatchingInlineSnapshot(
    `"KibanaFeature 'foo' already has a privilege with ID 'read'. Sub feature 'sub-feature-1' cannot also specify this."`
  );
});

it('does not allow features with sub-features which have id conflicts each other', () => {
  const feature: KibanaFeature = new KibanaFeature({
    id: 'foo',
    name: 'foo',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: {
      all: {
        savedObject: {
          all: ['foo'],
          read: ['bar'],
        },
        ui: [],
      },
      read: {
        savedObject: {
          all: ['foo'],
          read: ['bar', 'baz'],
        },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: 'sub-feature-1',
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'some-sub-feature',
                name: 'some sub feature',
                includeIn: 'all',
                savedObject: {
                  all: ['foo'],
                  read: ['bar', 'baz'],
                },
                ui: [],
              },
            ],
          },
        ],
      },
      {
        name: 'sub-feature-2',
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'some-sub-feature',
                name: 'some sub feature',
                includeIn: 'all',
                savedObject: {
                  all: ['foo'],
                  read: ['bar', 'baz'],
                },
                ui: [],
              },
            ],
          },
        ],
      },
    ],
  });

  expect(() => validateFeaturePrivileges([feature])).toThrowErrorMatchingInlineSnapshot(
    `"KibanaFeature 'foo' already has a privilege with ID 'some-sub-feature'. Sub feature 'sub-feature-2' cannot also specify this."`
  );
});
