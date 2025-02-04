/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFeature } from '@kbn/features-plugin/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { ApiOperation } from '@kbn/security-plugin-types-common';

import { getReplacedByForPrivilege, privilegesFactory } from './privileges';
import { licenseMock } from '../__fixtures__/licensing.mock';
import { Actions } from '../actions';

const actions = new Actions();

const mockLicenseServiceBasic = licenseMock.create({ allowSubFeaturePrivileges: false }, 'basic');
const mockLicenseServiceGold = licenseMock.create({ allowSubFeaturePrivileges: true }, 'gold');
const mockLicenseServicePlatinum = licenseMock.create(
  { allowSubFeaturePrivileges: true },
  'platinum'
);

describe('features', () => {
  test('actions defined at the feature do not cascade to the privileges', () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo-feature',
        name: 'Foo KibanaFeature',
        app: ['app-1', 'app-2'],
        category: { id: 'foo', label: 'foo' },
        catalogue: ['catalogue-1', 'catalogue-2'],
        management: {
          foo: ['management-1', 'management-2'],
        },
        privileges: {
          all: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
          read: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: [],
          },
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);

    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.foo-feature', {
      all: [actions.login],
      read: [actions.login],
      minimal_all: [actions.login],
      minimal_read: [actions.login],
    });
  });

  test(`actions only specified at the privilege are alright too`, () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            savedObject: {
              all: ['all-savedObject-all-1', 'all-savedObject-all-2'],
              read: ['all-savedObject-read-1', 'all-savedObject-read-2'],
            },
            ui: ['all-ui-1', 'all-ui-2'],
          },
          read: {
            savedObject: {
              all: ['read-savedObject-all-1', 'read-savedObject-all-2'],
              read: ['read-savedObject-read-1', 'read-savedObject-read-2'],
            },
            ui: ['read-ui-1', 'read-ui-2'],
          },
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const expectedAllPrivileges = [
      actions.login,
      actions.savedObject.get('all-savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('all-savedObject-all-1', 'get'),
      actions.savedObject.get('all-savedObject-all-1', 'find'),
      actions.savedObject.get('all-savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-all-1', 'create'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('all-savedObject-all-1', 'update'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('all-savedObject-all-1', 'delete'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_delete'),
      actions.savedObject.get('all-savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('all-savedObject-all-2', 'get'),
      actions.savedObject.get('all-savedObject-all-2', 'find'),
      actions.savedObject.get('all-savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-all-2', 'create'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('all-savedObject-all-2', 'update'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('all-savedObject-all-2', 'delete'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_delete'),
      actions.savedObject.get('all-savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('all-savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('all-savedObject-read-1', 'get'),
      actions.savedObject.get('all-savedObject-read-1', 'find'),
      actions.savedObject.get('all-savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-read-1', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('all-savedObject-read-2', 'get'),
      actions.savedObject.get('all-savedObject-read-2', 'find'),
      actions.savedObject.get('all-savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('foo', 'all-ui-1'),
      actions.ui.get('foo', 'all-ui-2'),
    ];

    const expectedReadPrivileges = [
      actions.login,
      actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('read-savedObject-all-1', 'get'),
      actions.savedObject.get('read-savedObject-all-1', 'find'),
      actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-all-1', 'create'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('read-savedObject-all-1', 'update'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('read-savedObject-all-1', 'delete'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_delete'),
      actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('read-savedObject-all-2', 'get'),
      actions.savedObject.get('read-savedObject-all-2', 'find'),
      actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-all-2', 'create'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('read-savedObject-all-2', 'update'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('read-savedObject-all-2', 'delete'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_delete'),
      actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('read-savedObject-read-1', 'get'),
      actions.savedObject.get('read-savedObject-read-1', 'find'),
      actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('read-savedObject-read-2', 'get'),
      actions.savedObject.get('read-savedObject-read-2', 'find'),
      actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('foo', 'read-ui-1'),
      actions.ui.get('foo', 'read-ui-2'),
    ];

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.foo', {
      all: [...expectedAllPrivileges],
      read: [...expectedReadPrivileges],
      minimal_all: [...expectedAllPrivileges],
      minimal_read: [...expectedReadPrivileges],
    });
  });

  test('actions should respect `composedOf` specified at the privilege', () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            savedObject: {
              all: ['all-savedObject-all-1'],
              read: ['all-savedObject-read-1'],
            },
            ui: ['all-ui-1'],
          },
          read: {
            savedObject: {
              all: ['read-savedObject-all-1'],
              read: ['read-savedObject-read-1'],
            },
            ui: ['read-ui-1'],
          },
        },
      }),
      new KibanaFeature({
        id: 'bar',
        name: 'Bar KibanaFeature',
        app: [],
        category: { id: 'bar', label: 'bar' },
        privileges: {
          all: {
            savedObject: {
              all: ['all-savedObject-all-2'],
              read: ['all-savedObject-read-2'],
            },
            ui: ['all-ui-2'],
            composedOf: [{ feature: 'foo', privileges: ['all'] }],
          },
          read: {
            savedObject: {
              all: ['read-savedObject-all-2'],
              read: ['read-savedObject-read-2'],
            },
            ui: ['read-ui-2'],
            composedOf: [{ feature: 'foo', privileges: ['read'] }],
          },
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const expectedAllPrivileges = [
      actions.login,
      actions.savedObject.get('all-savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('all-savedObject-all-2', 'get'),
      actions.savedObject.get('all-savedObject-all-2', 'find'),
      actions.savedObject.get('all-savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-all-2', 'create'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('all-savedObject-all-2', 'update'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('all-savedObject-all-2', 'delete'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_delete'),
      actions.savedObject.get('all-savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('all-savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('all-savedObject-read-2', 'get'),
      actions.savedObject.get('all-savedObject-read-2', 'find'),
      actions.savedObject.get('all-savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('bar', 'all-ui-2'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('all-savedObject-all-1', 'get'),
      actions.savedObject.get('all-savedObject-all-1', 'find'),
      actions.savedObject.get('all-savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-all-1', 'create'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('all-savedObject-all-1', 'update'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('all-savedObject-all-1', 'delete'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_delete'),
      actions.savedObject.get('all-savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('all-savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('all-savedObject-read-1', 'get'),
      actions.savedObject.get('all-savedObject-read-1', 'find'),
      actions.savedObject.get('all-savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-read-1', 'close_point_in_time'),
      actions.ui.get('foo', 'all-ui-1'),
    ];

    const expectedReadPrivileges = [
      actions.login,
      actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('read-savedObject-all-2', 'get'),
      actions.savedObject.get('read-savedObject-all-2', 'find'),
      actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-all-2', 'create'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('read-savedObject-all-2', 'update'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('read-savedObject-all-2', 'delete'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_delete'),
      actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('read-savedObject-read-2', 'get'),
      actions.savedObject.get('read-savedObject-read-2', 'find'),
      actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('bar', 'read-ui-2'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('read-savedObject-all-1', 'get'),
      actions.savedObject.get('read-savedObject-all-1', 'find'),
      actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-all-1', 'create'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('read-savedObject-all-1', 'update'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('read-savedObject-all-1', 'delete'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_delete'),
      actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('read-savedObject-read-1', 'get'),
      actions.savedObject.get('read-savedObject-read-1', 'find'),
      actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
      actions.ui.get('foo', 'read-ui-1'),
    ];

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.bar', {
      all: [...expectedAllPrivileges],
      read: [...expectedReadPrivileges],
      minimal_all: [...expectedAllPrivileges],
      minimal_read: [...expectedReadPrivileges],
    });
  });

  test('actions should respect `composedOf` specified at the privilege even if the referenced feature is hidden', () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        hidden: true,
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            savedObject: {
              all: ['all-savedObject-all-1'],
              read: ['all-savedObject-read-1'],
            },
            ui: ['all-ui-1'],
          },
          read: {
            savedObject: {
              all: ['read-savedObject-all-1'],
              read: ['read-savedObject-read-1'],
            },
            ui: ['read-ui-1'],
          },
        },
      }),
      new KibanaFeature({
        id: 'bar',
        name: 'Bar KibanaFeature',
        app: [],
        category: { id: 'bar', label: 'bar' },
        privileges: {
          all: {
            savedObject: {
              all: ['all-savedObject-all-2'],
              read: ['all-savedObject-read-2'],
            },
            ui: ['all-ui-2'],
            composedOf: [{ feature: 'foo', privileges: ['all'] }],
          },
          read: {
            savedObject: {
              all: ['read-savedObject-all-2'],
              read: ['read-savedObject-read-2'],
            },
            ui: ['read-ui-2'],
            composedOf: [{ feature: 'foo', privileges: ['read'] }],
          },
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const expectedAllPrivileges = [
      actions.login,
      actions.savedObject.get('all-savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('all-savedObject-all-2', 'get'),
      actions.savedObject.get('all-savedObject-all-2', 'find'),
      actions.savedObject.get('all-savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-all-2', 'create'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('all-savedObject-all-2', 'update'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('all-savedObject-all-2', 'delete'),
      actions.savedObject.get('all-savedObject-all-2', 'bulk_delete'),
      actions.savedObject.get('all-savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('all-savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('all-savedObject-read-2', 'get'),
      actions.savedObject.get('all-savedObject-read-2', 'find'),
      actions.savedObject.get('all-savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('bar', 'all-ui-2'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('all-savedObject-all-1', 'get'),
      actions.savedObject.get('all-savedObject-all-1', 'find'),
      actions.savedObject.get('all-savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('all-savedObject-all-1', 'create'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('all-savedObject-all-1', 'update'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('all-savedObject-all-1', 'delete'),
      actions.savedObject.get('all-savedObject-all-1', 'bulk_delete'),
      actions.savedObject.get('all-savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('all-savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('all-savedObject-read-1', 'get'),
      actions.savedObject.get('all-savedObject-read-1', 'find'),
      actions.savedObject.get('all-savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('all-savedObject-read-1', 'close_point_in_time'),
      actions.ui.get('foo', 'all-ui-1'),
    ];

    const expectedReadPrivileges = [
      actions.login,
      actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('read-savedObject-all-2', 'get'),
      actions.savedObject.get('read-savedObject-all-2', 'find'),
      actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-all-2', 'create'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('read-savedObject-all-2', 'update'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('read-savedObject-all-2', 'delete'),
      actions.savedObject.get('read-savedObject-all-2', 'bulk_delete'),
      actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('read-savedObject-read-2', 'get'),
      actions.savedObject.get('read-savedObject-read-2', 'find'),
      actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('bar', 'read-ui-2'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('read-savedObject-all-1', 'get'),
      actions.savedObject.get('read-savedObject-all-1', 'find'),
      actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('read-savedObject-all-1', 'create'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('read-savedObject-all-1', 'update'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('read-savedObject-all-1', 'delete'),
      actions.savedObject.get('read-savedObject-all-1', 'bulk_delete'),
      actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('read-savedObject-read-1', 'get'),
      actions.savedObject.get('read-savedObject-read-1', 'find'),
      actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
      actions.ui.get('foo', 'read-ui-1'),
    ];

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.bar', {
      all: [...expectedAllPrivileges],
      read: [...expectedReadPrivileges],
      minimal_all: [...expectedAllPrivileges],
      minimal_read: [...expectedReadPrivileges],
    });
  });

  test('actions should respect `replacedBy` specified by the deprecated privileges', () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        deprecated: { notice: 'It is deprecated, sorry.' },
        id: 'alpha',
        name: 'Feature Alpha',
        app: [],
        category: { id: 'alpha', label: 'alpha' },
        alerting: [{ ruleTypeId: 'rule-type-1', consumers: ['alpha'] }],
        privileges: {
          all: {
            savedObject: {
              all: ['all-alpha-all-so'],
              read: ['all-alpha-read-so'],
            },
            ui: ['all-alpha-ui'],
            app: ['all-alpha-app'],
            api: ['all-alpha-api'],
            alerting: { rule: { all: [{ ruleTypeId: 'rule-type-1', consumers: ['alpha'] }] } },
            replacedBy: [{ feature: 'beta', privileges: ['all'] }],
          },
          read: {
            savedObject: {
              all: ['read-alpha-all-so'],
              read: ['read-alpha-read-so'],
            },
            ui: ['read-alpha-ui'],
            app: ['read-alpha-app'],
            api: ['read-alpha-api'],
            replacedBy: {
              default: [{ feature: 'beta', privileges: ['read'] }],
              minimal: [{ feature: 'beta', privileges: ['minimal_read'] }],
            },
          },
        },
      }),
      new KibanaFeature({
        id: 'beta',
        name: 'Feature Beta',
        app: [],
        category: { id: 'beta', label: 'beta' },
        alerting: [{ ruleTypeId: 'rule-type-1', consumers: ['beta'] }],
        privileges: {
          all: {
            savedObject: {
              all: ['all-beta-all-so'],
              read: ['all-beta-read-so'],
            },
            ui: ['all-beta-ui'],
            app: ['all-beta-app'],
            api: ['all-beta-api'],
            alerting: { rule: { all: [{ ruleTypeId: 'rule-type-1', consumers: ['beta'] }] } },
          },
          read: {
            savedObject: {
              all: ['read-beta-all-so'],
              read: ['read-beta-read-so'],
            },
            ui: ['read-beta-ui'],
            app: ['read-beta-app'],
            api: ['read-beta-api'],
          },
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const alertingOperations = [
      ...[
        'get',
        'getRuleState',
        'getAlertSummary',
        'getExecutionLog',
        'getActionErrorLog',
        'find',
        'getRuleExecutionKPI',
        'getBackfill',
        'findBackfill',
        'findGaps',
      ],
      ...[
        'create',
        'delete',
        'update',
        'updateApiKey',
        'enable',
        'disable',
        'muteAll',
        'unmuteAll',
        'muteAlert',
        'unmuteAlert',
        'snooze',
        'bulkEdit',
        'bulkDelete',
        'bulkEnable',
        'bulkDisable',
        'unsnooze',
        'runSoon',
        'scheduleBackfill',
        'deleteBackfill',
        'fillGaps',
      ],
    ];

    const expectedAllPrivileges = [
      actions.login,
      actions.api.get('all-alpha-api'),
      actions.app.get('all-alpha-app'),
      actions.ui.get('navLinks', 'all-alpha-app'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_get'),
      actions.savedObject.get('all-alpha-all-so', 'get'),
      actions.savedObject.get('all-alpha-all-so', 'find'),
      actions.savedObject.get('all-alpha-all-so', 'open_point_in_time'),
      actions.savedObject.get('all-alpha-all-so', 'close_point_in_time'),
      actions.savedObject.get('all-alpha-all-so', 'create'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_create'),
      actions.savedObject.get('all-alpha-all-so', 'update'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_update'),
      actions.savedObject.get('all-alpha-all-so', 'delete'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_delete'),
      actions.savedObject.get('all-alpha-all-so', 'share_to_space'),
      actions.savedObject.get('all-alpha-read-so', 'bulk_get'),
      actions.savedObject.get('all-alpha-read-so', 'get'),
      actions.savedObject.get('all-alpha-read-so', 'find'),
      actions.savedObject.get('all-alpha-read-so', 'open_point_in_time'),
      actions.savedObject.get('all-alpha-read-so', 'close_point_in_time'),
      actions.ui.get('alpha', 'all-alpha-ui'),
      ...alertingOperations.map((operation) =>
        actions.alerting.get('rule-type-1', 'alpha', 'rule', operation)
      ),
      actions.ui.get('navLinks', 'all-beta-app'),
      actions.ui.get('beta', 'all-beta-ui'),
    ];

    const expectedReadPrivileges = [
      actions.login,
      actions.api.get('read-alpha-api'),
      actions.app.get('read-alpha-app'),
      actions.ui.get('navLinks', 'read-alpha-app'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_get'),
      actions.savedObject.get('read-alpha-all-so', 'get'),
      actions.savedObject.get('read-alpha-all-so', 'find'),
      actions.savedObject.get('read-alpha-all-so', 'open_point_in_time'),
      actions.savedObject.get('read-alpha-all-so', 'close_point_in_time'),
      actions.savedObject.get('read-alpha-all-so', 'create'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_create'),
      actions.savedObject.get('read-alpha-all-so', 'update'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_update'),
      actions.savedObject.get('read-alpha-all-so', 'delete'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_delete'),
      actions.savedObject.get('read-alpha-all-so', 'share_to_space'),
      actions.savedObject.get('read-alpha-read-so', 'bulk_get'),
      actions.savedObject.get('read-alpha-read-so', 'get'),
      actions.savedObject.get('read-alpha-read-so', 'find'),
      actions.savedObject.get('read-alpha-read-so', 'open_point_in_time'),
      actions.savedObject.get('read-alpha-read-so', 'close_point_in_time'),
      actions.ui.get('alpha', 'read-alpha-ui'),
      // To maintain compatibility with the new UI capabilities that are feature specific
      // read.replacedBy: [{ feature: 'beta', privileges: ['read'] }]
      actions.ui.get('navLinks', 'read-beta-app'),
      actions.ui.get('beta', 'read-beta-ui'),
    ];

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.alpha', {
      all: [...expectedAllPrivileges],
      read: [...expectedReadPrivileges],
      minimal_all: [...expectedAllPrivileges],
      minimal_read: [...expectedReadPrivileges],
    });
  });

  test(`features with no privileges aren't listed`, () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).not.toHaveProperty('features.foo');
  });

  test(`hidden features aren't listed`, () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        hidden: true,
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            management: {
              'all-management': ['all-management-1'],
            },
            catalogue: ['all-catalogue-1'],
            savedObject: {
              all: ['all-savedObject-all-1'],
              read: ['all-savedObject-read-1'],
            },
            ui: ['all-ui-1'],
          },
          read: {
            management: {
              'read-management': ['read-management-1'],
            },
            catalogue: ['read-catalogue-1'],
            savedObject: {
              all: ['read-savedObject-all-1'],
              read: ['read-savedObject-read-1'],
            },
            ui: ['read-ui-1'],
          },
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).not.toHaveProperty('features.foo');

    const checkPredicate = (action: string) => action.includes('all-') || action.includes('read-');
    expect(actual.global.all.some(checkPredicate)).toBe(false);
    expect(actual.global.read.some(checkPredicate)).toBe(false);
    expect(actual.space.all.some(checkPredicate)).toBe(false);
    expect(actual.space.read.some(checkPredicate)).toBe(false);
  });
});

// the `global` and `space` privileges behave very similarly, with the one exception being that
// "global all" includes the ability to manage spaces. The following tests both groups at once...
[
  {
    group: 'global',
    expectManageSpaces: true,
    expectGetFeatures: true,
    expectEnterpriseSearch: true,
    expectDecryptedTelemetry: true,
    expectGlobalSettings: true,
  },
  {
    group: 'space',
    expectManageSpaces: false,
    expectGetFeatures: false,
    expectEnterpriseSearch: false,
    expectDecryptedTelemetry: false,
    expectGlobalSettings: false,
  },
].forEach(
  ({
    group,
    expectManageSpaces,
    expectGetFeatures,
    expectEnterpriseSearch,
    expectDecryptedTelemetry,
    expectGlobalSettings,
  }) => {
    describe(`${group}`, () => {
      test('actions defined in any feature privilege are included in `all`', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['ignore-me-1', 'ignore-me-2'],
            management: {
              foo: ['ignore-me-1', 'ignore-me-2'],
            },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-1', 'all-management-2'],
                },
                catalogue: ['all-catalogue-1', 'all-catalogue-2'],
                savedObject: {
                  all: ['all-savedObject-all-1', 'all-savedObject-all-2'],
                  read: ['all-savedObject-read-1', 'all-savedObject-read-2'],
                },
                ui: ['all-ui-1', 'all-ui-2'],
              },
              read: {
                management: {
                  'read-management': ['read-management-1', 'read-management-2'],
                },
                catalogue: ['read-catalogue-1', 'read-catalogue-2'],
                savedObject: {
                  all: ['read-savedObject-all-1', 'read-savedObject-all-2'],
                  read: ['read-savedObject-read-1', 'read-savedObject-read-2'],
                },
                ui: ['read-ui-1', 'read-ui-2'],
              },
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Read, 'features')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'taskManager')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'spaces')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'save')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
          actions.ui.get('catalogue', 'all-catalogue-1'),
          actions.ui.get('catalogue', 'all-catalogue-2'),
          actions.ui.get('management', 'all-management', 'all-management-1'),
          actions.ui.get('management', 'all-management', 'all-management-2'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_get'),
          actions.savedObject.get('all-savedObject-all-1', 'get'),
          actions.savedObject.get('all-savedObject-all-1', 'find'),
          actions.savedObject.get('all-savedObject-all-1', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-all-1', 'close_point_in_time'),
          actions.savedObject.get('all-savedObject-all-1', 'create'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_create'),
          actions.savedObject.get('all-savedObject-all-1', 'update'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_update'),
          actions.savedObject.get('all-savedObject-all-1', 'delete'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_delete'),
          actions.savedObject.get('all-savedObject-all-1', 'share_to_space'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_get'),
          actions.savedObject.get('all-savedObject-all-2', 'get'),
          actions.savedObject.get('all-savedObject-all-2', 'find'),
          actions.savedObject.get('all-savedObject-all-2', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-all-2', 'close_point_in_time'),
          actions.savedObject.get('all-savedObject-all-2', 'create'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_create'),
          actions.savedObject.get('all-savedObject-all-2', 'update'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_update'),
          actions.savedObject.get('all-savedObject-all-2', 'delete'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_delete'),
          actions.savedObject.get('all-savedObject-all-2', 'share_to_space'),
          actions.savedObject.get('all-savedObject-read-1', 'bulk_get'),
          actions.savedObject.get('all-savedObject-read-1', 'get'),
          actions.savedObject.get('all-savedObject-read-1', 'find'),
          actions.savedObject.get('all-savedObject-read-1', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-read-1', 'close_point_in_time'),
          actions.savedObject.get('all-savedObject-read-2', 'bulk_get'),
          actions.savedObject.get('all-savedObject-read-2', 'get'),
          actions.savedObject.get('all-savedObject-read-2', 'find'),
          actions.savedObject.get('all-savedObject-read-2', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-read-2', 'close_point_in_time'),
          actions.ui.get('foo', 'all-ui-1'),
          actions.ui.get('foo', 'all-ui-2'),
          actions.ui.get('catalogue', 'read-catalogue-1'),
          actions.ui.get('catalogue', 'read-catalogue-2'),
          actions.ui.get('management', 'read-management', 'read-management-1'),
          actions.ui.get('management', 'read-management', 'read-management-2'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-1', 'get'),
          actions.savedObject.get('read-savedObject-all-1', 'find'),
          actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'create'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-1', 'update'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-1', 'delete'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_delete'),
          actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-2', 'get'),
          actions.savedObject.get('read-savedObject-all-2', 'find'),
          actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'create'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-2', 'update'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-2', 'delete'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_delete'),
          actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
          actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-1', 'get'),
          actions.savedObject.get('read-savedObject-read-1', 'find'),
          actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-2', 'get'),
          actions.savedObject.get('read-savedObject-read-2', 'find'),
          actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
          actions.ui.get('foo', 'read-ui-1'),
          actions.ui.get('foo', 'read-ui-2'),
        ]);
      });

      test('actions defined in any feature privilege of a hidden but referenced feature are included in `all`, ignoring the excludeFromBasePrivileges property', () => {
        const getFeatures = ({
          excludeFromBasePrivileges,
        }: {
          excludeFromBasePrivileges: boolean;
        }) => [
          new KibanaFeature({
            hidden: true,
            excludeFromBasePrivileges,
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-1'],
                },
                catalogue: ['all-catalogue-1'],
                savedObject: {
                  all: ['all-savedObject-all-1'],
                  read: ['all-savedObject-read-1'],
                },
                ui: ['all-ui-1'],
              },
              read: {
                management: {
                  'read-management': ['read-management-1'],
                },
                catalogue: ['read-catalogue-1'],
                savedObject: {
                  all: ['read-savedObject-all-1'],
                  read: ['read-savedObject-read-1'],
                },
                ui: ['read-ui-1'],
              },
            },
          }),
          new KibanaFeature({
            id: 'bar',
            name: 'Bar KibanaFeature',
            app: [],
            category: { id: 'bar', label: 'bar' },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-2'],
                },
                catalogue: ['all-catalogue-2'],
                savedObject: {
                  all: ['all-savedObject-all-2'],
                  read: ['all-savedObject-read-2'],
                },
                ui: ['all-ui-2'],
                composedOf: [{ feature: 'foo', privileges: ['all'] }],
              },
              read: {
                management: {
                  'read-management': ['read-management-2'],
                },
                catalogue: ['read-catalogue-2'],
                savedObject: {
                  all: ['read-savedObject-all-2'],
                  read: ['read-savedObject-read-2'],
                },
                ui: ['read-ui-2'],
                composedOf: [{ feature: 'foo', privileges: ['read'] }],
              },
            },
          }),
        ];

        const expectedActions = [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Read, 'features')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'taskManager')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'spaces')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'save')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
          actions.ui.get('catalogue', 'all-catalogue-2'),
          actions.ui.get('management', 'all-management', 'all-management-2'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_get'),
          actions.savedObject.get('all-savedObject-all-2', 'get'),
          actions.savedObject.get('all-savedObject-all-2', 'find'),
          actions.savedObject.get('all-savedObject-all-2', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-all-2', 'close_point_in_time'),
          actions.savedObject.get('all-savedObject-all-2', 'create'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_create'),
          actions.savedObject.get('all-savedObject-all-2', 'update'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_update'),
          actions.savedObject.get('all-savedObject-all-2', 'delete'),
          actions.savedObject.get('all-savedObject-all-2', 'bulk_delete'),
          actions.savedObject.get('all-savedObject-all-2', 'share_to_space'),
          actions.savedObject.get('all-savedObject-read-2', 'bulk_get'),
          actions.savedObject.get('all-savedObject-read-2', 'get'),
          actions.savedObject.get('all-savedObject-read-2', 'find'),
          actions.savedObject.get('all-savedObject-read-2', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-read-2', 'close_point_in_time'),
          actions.ui.get('bar', 'all-ui-2'),
          actions.ui.get('catalogue', 'read-catalogue-2'),
          actions.ui.get('management', 'read-management', 'read-management-2'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-2', 'get'),
          actions.savedObject.get('read-savedObject-all-2', 'find'),
          actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'create'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-2', 'update'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-2', 'delete'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_delete'),
          actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
          actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-2', 'get'),
          actions.savedObject.get('read-savedObject-read-2', 'find'),
          actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
          actions.ui.get('bar', 'read-ui-2'),
          actions.ui.get('catalogue', 'all-catalogue-1'),
          actions.ui.get('management', 'all-management', 'all-management-1'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_get'),
          actions.savedObject.get('all-savedObject-all-1', 'get'),
          actions.savedObject.get('all-savedObject-all-1', 'find'),
          actions.savedObject.get('all-savedObject-all-1', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-all-1', 'close_point_in_time'),
          actions.savedObject.get('all-savedObject-all-1', 'create'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_create'),
          actions.savedObject.get('all-savedObject-all-1', 'update'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_update'),
          actions.savedObject.get('all-savedObject-all-1', 'delete'),
          actions.savedObject.get('all-savedObject-all-1', 'bulk_delete'),
          actions.savedObject.get('all-savedObject-all-1', 'share_to_space'),
          actions.savedObject.get('all-savedObject-read-1', 'bulk_get'),
          actions.savedObject.get('all-savedObject-read-1', 'get'),
          actions.savedObject.get('all-savedObject-read-1', 'find'),
          actions.savedObject.get('all-savedObject-read-1', 'open_point_in_time'),
          actions.savedObject.get('all-savedObject-read-1', 'close_point_in_time'),
          actions.ui.get('foo', 'all-ui-1'),
          actions.ui.get('catalogue', 'read-catalogue-1'),
          actions.ui.get('management', 'read-management', 'read-management-1'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-1', 'get'),
          actions.savedObject.get('read-savedObject-all-1', 'find'),
          actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'create'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-1', 'update'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-1', 'delete'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_delete'),
          actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
          actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-1', 'get'),
          actions.savedObject.get('read-savedObject-read-1', 'find'),
          actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
          actions.ui.get('foo', 'read-ui-1'),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();

        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(
          getFeatures({ excludeFromBasePrivileges: false })
        );
        expect(
          privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic).get()
        ).toHaveProperty(`${group}.all`, expectedActions);

        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(
          getFeatures({ excludeFromBasePrivileges: true })
        );
        expect(
          privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic).get()
        ).toHaveProperty(`${group}.all`, expectedActions);
      });

      test('actions defined in a feature privilege with name `read` are included in `read`', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['ignore-me-1', 'ignore-me-2'],
            management: {
              foo: ['ignore-me-1', 'ignore-me-2'],
            },
            privileges: {
              all: {
                management: {
                  'ignore-me': ['ignore-me-1', 'ignore-me-2'],
                },
                catalogue: ['ignore-me-1', 'ignore-me-2'],
                savedObject: {
                  all: ['ignore-me-1', 'ignore-me-2'],
                  read: ['ignore-me-1', 'ignore-me-2'],
                },
                ui: ['ignore-me-1', 'ignore-me-2'],
              },
              read: {
                management: {
                  'read-management': ['read-management-1', 'read-management-2'],
                },
                catalogue: ['read-catalogue-1', 'read-catalogue-2'],
                savedObject: {
                  all: ['read-savedObject-all-1', 'read-savedObject-all-2'],
                  read: ['read-savedObject-read-1', 'read-savedObject-read-2'],
                },
                ui: ['read-ui-1', 'read-ui-2'],
              },
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
          actions.ui.get('catalogue', 'read-catalogue-1'),
          actions.ui.get('catalogue', 'read-catalogue-2'),
          actions.ui.get('management', 'read-management', 'read-management-1'),
          actions.ui.get('management', 'read-management', 'read-management-2'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-1', 'get'),
          actions.savedObject.get('read-savedObject-all-1', 'find'),
          actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'create'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-1', 'update'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-1', 'delete'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_delete'),
          actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-2', 'get'),
          actions.savedObject.get('read-savedObject-all-2', 'find'),
          actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'create'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-2', 'update'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-2', 'delete'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_delete'),
          actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
          actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-1', 'get'),
          actions.savedObject.get('read-savedObject-read-1', 'find'),
          actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-2', 'get'),
          actions.savedObject.get('read-savedObject-read-2', 'find'),
          actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
          actions.ui.get('foo', 'read-ui-1'),
          actions.ui.get('foo', 'read-ui-2'),
        ]);
      });

      test('actions defined in a feature privilege with name `read` of a hidden but referenced feature are included in `read`, ignoring the excludeFromBasePrivileges property', () => {
        const getFeatures = ({
          excludeFromBasePrivileges,
        }: {
          excludeFromBasePrivileges: boolean;
        }) => [
          new KibanaFeature({
            hidden: true,
            excludeFromBasePrivileges,
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-1'],
                },
                catalogue: ['all-catalogue-1'],
                savedObject: {
                  all: ['all-savedObject-all-1'],
                  read: ['all-savedObject-read-1'],
                },
                ui: ['all-ui-1'],
              },
              read: {
                management: {
                  'read-management': ['read-management-1'],
                },
                catalogue: ['read-catalogue-1'],
                savedObject: {
                  all: ['read-savedObject-all-1'],
                  read: ['read-savedObject-read-1'],
                },
                ui: ['read-ui-1'],
              },
            },
          }),
          new KibanaFeature({
            id: 'bar',
            name: 'Bar KibanaFeature',
            app: [],
            category: { id: 'bar', label: 'bar' },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-2'],
                },
                catalogue: ['all-catalogue-2'],
                savedObject: {
                  all: ['all-savedObject-all-2'],
                  read: ['all-savedObject-read-2'],
                },
                ui: ['all-ui-2'],
                composedOf: [{ feature: 'foo', privileges: ['all'] }],
              },
              read: {
                management: {
                  'read-management': ['read-management-2'],
                },
                catalogue: ['read-catalogue-2'],
                savedObject: {
                  all: ['read-savedObject-all-2'],
                  read: ['read-savedObject-read-2'],
                },
                ui: ['read-ui-2'],
                composedOf: [{ feature: 'foo', privileges: ['read'] }],
              },
            },
          }),
        ];

        const expectedActions = [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
          actions.ui.get('catalogue', 'read-catalogue-2'),
          actions.ui.get('management', 'read-management', 'read-management-2'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-2', 'get'),
          actions.savedObject.get('read-savedObject-all-2', 'find'),
          actions.savedObject.get('read-savedObject-all-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-2', 'create'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-2', 'update'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-2', 'delete'),
          actions.savedObject.get('read-savedObject-all-2', 'bulk_delete'),
          actions.savedObject.get('read-savedObject-all-2', 'share_to_space'),
          actions.savedObject.get('read-savedObject-read-2', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-2', 'get'),
          actions.savedObject.get('read-savedObject-read-2', 'find'),
          actions.savedObject.get('read-savedObject-read-2', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-2', 'close_point_in_time'),
          actions.ui.get('bar', 'read-ui-2'),
          actions.ui.get('catalogue', 'read-catalogue-1'),
          actions.ui.get('management', 'read-management', 'read-management-1'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-all-1', 'get'),
          actions.savedObject.get('read-savedObject-all-1', 'find'),
          actions.savedObject.get('read-savedObject-all-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'close_point_in_time'),
          actions.savedObject.get('read-savedObject-all-1', 'create'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_create'),
          actions.savedObject.get('read-savedObject-all-1', 'update'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_update'),
          actions.savedObject.get('read-savedObject-all-1', 'delete'),
          actions.savedObject.get('read-savedObject-all-1', 'bulk_delete'),
          actions.savedObject.get('read-savedObject-all-1', 'share_to_space'),
          actions.savedObject.get('read-savedObject-read-1', 'bulk_get'),
          actions.savedObject.get('read-savedObject-read-1', 'get'),
          actions.savedObject.get('read-savedObject-read-1', 'find'),
          actions.savedObject.get('read-savedObject-read-1', 'open_point_in_time'),
          actions.savedObject.get('read-savedObject-read-1', 'close_point_in_time'),
          actions.ui.get('foo', 'read-ui-1'),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();

        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(
          getFeatures({ excludeFromBasePrivileges: false })
        );
        expect(
          privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic).get()
        ).toHaveProperty(`${group}.read`, expectedActions);

        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(
          getFeatures({ excludeFromBasePrivileges: true })
        );
        expect(
          privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic).get()
        ).toHaveProperty(`${group}.read`, expectedActions);
      });

      test('actions defined in a reserved privilege are not included in `all` or `read`', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['ignore-me-1', 'ignore-me-2'],
            management: {
              foo: ['ignore-me-1', 'ignore-me-2'],
            },
            privileges: null,
            reserved: {
              privileges: [
                {
                  id: 'reserved',
                  privilege: {
                    savedObject: {
                      all: ['ignore-me-1', 'ignore-me-2'],
                      read: ['ignore-me-1', 'ignore-me-2'],
                    },
                    ui: ['ignore-me-1'],
                  },
                },
              ],
              description: '',
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Read, 'features')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'taskManager')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'spaces')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'save')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
      });

      test('actions defined in a feature with excludeFromBasePrivileges are not included in `all` or `read', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            excludeFromBasePrivileges: true,
            app: [],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['ignore-me-1', 'ignore-me-2'],
            management: {
              foo: ['ignore-me-1', 'ignore-me-2'],
            },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-1'],
                },
                catalogue: ['all-catalogue-1'],
                savedObject: {
                  all: ['all-savedObject-all-1'],
                  read: ['all-savedObject-read-1'],
                },
                ui: ['all-ui-1'],
              },
              read: {
                management: {
                  'read-management': ['read-management-1'],
                },
                catalogue: ['read-catalogue-1'],
                savedObject: {
                  all: ['read-savedObject-all-1'],
                  read: ['read-savedObject-read-1'],
                },
                ui: ['read-ui-1'],
              },
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Read, 'features')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'taskManager')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'spaces')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'save')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
      });

      test('actions defined via `composedOf` in a feature with excludeFromBasePrivileges are not included in `all` or `read', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            hidden: true,
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-1'],
                },
                catalogue: ['all-catalogue-1'],
                savedObject: {
                  all: ['all-savedObject-all-1'],
                  read: ['all-savedObject-read-1'],
                },
                ui: ['all-ui-1'],
              },
              read: {
                management: {
                  'read-management': ['read-management-1'],
                },
                catalogue: ['read-catalogue-1'],
                savedObject: {
                  all: ['read-savedObject-all-1'],
                  read: ['read-savedObject-read-1'],
                },
                ui: ['read-ui-1'],
              },
            },
          }),
          new KibanaFeature({
            excludeFromBasePrivileges: true,
            id: 'bar',
            name: 'Bar KibanaFeature',
            app: [],
            category: { id: 'bar', label: 'bar' },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-2'],
                },
                catalogue: ['all-catalogue-2'],
                savedObject: {
                  all: ['all-savedObject-all-2'],
                  read: ['all-savedObject-read-2'],
                },
                ui: ['all-ui-2'],
                composedOf: [{ feature: 'foo', privileges: ['all'] }],
              },
              read: {
                management: {
                  'read-management': ['read-management-2'],
                },
                catalogue: ['read-catalogue-2'],
                savedObject: {
                  all: ['read-savedObject-all-2'],
                  read: ['read-savedObject-read-2'],
                },
                ui: ['read-ui-2'],
                composedOf: [{ feature: 'foo', privileges: ['read'] }],
              },
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Read, 'features')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'taskManager')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'spaces')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'save')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
      });

      test('actions defined in an individual feature privilege with excludeFromBasePrivileges are not included in `all` or `read`', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            catalogue: ['ignore-me-1', 'ignore-me-2'],
            management: {
              foo: ['ignore-me-1', 'ignore-me-2'],
            },
            privileges: {
              all: {
                excludeFromBasePrivileges: true,
                management: {
                  'all-management': ['all-management-1'],
                },
                catalogue: ['all-catalogue-1'],
                savedObject: {
                  all: ['all-savedObject-all-1'],
                  read: ['all-savedObject-read-1'],
                },
                ui: ['all-ui-1'],
              },
              read: {
                excludeFromBasePrivileges: true,
                management: {
                  'read-management': ['read-management-1'],
                },
                catalogue: ['read-catalogue-1'],
                savedObject: {
                  all: ['read-savedObject-all-1'],
                  read: ['read-savedObject-read-1'],
                },
                ui: ['read-ui-1'],
              },
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Read, 'features')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'taskManager')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'spaces')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'save')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
      });

      test('actions defined via `composedOf` in an individual feature privilege with excludeFromBasePrivileges are not included in `all` or `read`', () => {
        const features: KibanaFeature[] = [
          new KibanaFeature({
            hidden: true,
            id: 'foo',
            name: 'Foo KibanaFeature',
            app: [],
            category: { id: 'foo', label: 'foo' },
            privileges: {
              all: {
                management: {
                  'all-management': ['all-management-1'],
                },
                catalogue: ['all-catalogue-1'],
                savedObject: {
                  all: ['all-savedObject-all-1'],
                  read: ['all-savedObject-read-1'],
                },
                ui: ['all-ui-1'],
              },
              read: {
                management: {
                  'read-management': ['read-management-1'],
                },
                catalogue: ['read-catalogue-1'],
                savedObject: {
                  all: ['read-savedObject-all-1'],
                  read: ['read-savedObject-read-1'],
                },
                ui: ['read-ui-1'],
              },
            },
          }),
          new KibanaFeature({
            id: 'bar',
            name: 'Bar KibanaFeature',
            app: [],
            category: { id: 'bar', label: 'bar' },
            privileges: {
              all: {
                excludeFromBasePrivileges: true,
                management: {
                  'all-management': ['all-management-2'],
                },
                catalogue: ['all-catalogue-2'],
                savedObject: {
                  all: ['all-savedObject-all-2'],
                  read: ['all-savedObject-read-2'],
                },
                ui: ['all-ui-2'],
                composedOf: [{ feature: 'foo', privileges: ['all'] }],
              },
              read: {
                excludeFromBasePrivileges: true,
                management: {
                  'read-management': ['read-management-2'],
                },
                catalogue: ['read-catalogue-2'],
                savedObject: {
                  all: ['read-savedObject-all-2'],
                  read: ['read-savedObject-read-2'],
                },
                ui: ['read-ui-2'],
                composedOf: [{ feature: 'foo', privileges: ['read'] }],
              },
            },
          }),
        ];

        const mockFeaturesPlugin = featuresPluginMock.createSetup();
        mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
        const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

        const actual = privileges.get();
        expect(actual).toHaveProperty(`${group}.all`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Read, 'features')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'taskManager')] : []),
          ...(expectGetFeatures ? [actions.api.get(ApiOperation.Manage, 'spaces')] : []),
          ...(expectManageSpaces
            ? [
                actions.space.manage,
                actions.ui.get('spaces', 'manage'),
                actions.ui.get('management', 'kibana', 'spaces'),
                actions.ui.get('catalogue', 'spaces'),
              ]
            : []),
          ...(expectEnterpriseSearch ? [actions.ui.get('enterpriseSearch', 'all')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'save')] : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
        expect(actual).toHaveProperty(`${group}.read`, [
          actions.login,
          ...(expectDecryptedTelemetry
            ? [actions.api.get(ApiOperation.Read, 'decryptedTelemetry')]
            : []),
          ...(expectGlobalSettings ? [actions.ui.get('globalSettings', 'show')] : []),
        ]);
      });
    });
  }
);

describe('reserved', () => {
  test('actions defined at the feature do not cascade to the privileges', () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: ['app-1', 'app-2'],
        category: { id: 'foo', label: 'foo' },
        catalogue: ['catalogue-1', 'catalogue-2'],
        management: {
          foo: ['management-1', 'management-2'],
        },
        privileges: null,
        reserved: {
          privileges: [
            {
              id: 'foo',
              privilege: {
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: [],
              },
            },
          ],
          description: '',
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).toHaveProperty('reserved.foo');
  });

  test(`actions only specified at the privilege are alright too`, () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: null,
        reserved: {
          privileges: [
            {
              id: 'foo',
              privilege: {
                savedObject: {
                  all: ['savedObject-all-1', 'savedObject-all-2'],
                  read: ['savedObject-read-1', 'savedObject-read-2'],
                },
                ui: ['ui-1', 'ui-2'],
              },
            },
          ],
          description: '',
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).toHaveProperty('reserved.foo', [
      actions.savedObject.get('savedObject-all-1', 'bulk_get'),
      actions.savedObject.get('savedObject-all-1', 'get'),
      actions.savedObject.get('savedObject-all-1', 'find'),
      actions.savedObject.get('savedObject-all-1', 'open_point_in_time'),
      actions.savedObject.get('savedObject-all-1', 'close_point_in_time'),
      actions.savedObject.get('savedObject-all-1', 'create'),
      actions.savedObject.get('savedObject-all-1', 'bulk_create'),
      actions.savedObject.get('savedObject-all-1', 'update'),
      actions.savedObject.get('savedObject-all-1', 'bulk_update'),
      actions.savedObject.get('savedObject-all-1', 'delete'),
      actions.savedObject.get('savedObject-all-1', 'bulk_delete'),
      actions.savedObject.get('savedObject-all-1', 'share_to_space'),
      actions.savedObject.get('savedObject-all-2', 'bulk_get'),
      actions.savedObject.get('savedObject-all-2', 'get'),
      actions.savedObject.get('savedObject-all-2', 'find'),
      actions.savedObject.get('savedObject-all-2', 'open_point_in_time'),
      actions.savedObject.get('savedObject-all-2', 'close_point_in_time'),
      actions.savedObject.get('savedObject-all-2', 'create'),
      actions.savedObject.get('savedObject-all-2', 'bulk_create'),
      actions.savedObject.get('savedObject-all-2', 'update'),
      actions.savedObject.get('savedObject-all-2', 'bulk_update'),
      actions.savedObject.get('savedObject-all-2', 'delete'),
      actions.savedObject.get('savedObject-all-2', 'bulk_delete'),
      actions.savedObject.get('savedObject-all-2', 'share_to_space'),
      actions.savedObject.get('savedObject-read-1', 'bulk_get'),
      actions.savedObject.get('savedObject-read-1', 'get'),
      actions.savedObject.get('savedObject-read-1', 'find'),
      actions.savedObject.get('savedObject-read-1', 'open_point_in_time'),
      actions.savedObject.get('savedObject-read-1', 'close_point_in_time'),
      actions.savedObject.get('savedObject-read-2', 'bulk_get'),
      actions.savedObject.get('savedObject-read-2', 'get'),
      actions.savedObject.get('savedObject-read-2', 'find'),
      actions.savedObject.get('savedObject-read-2', 'open_point_in_time'),
      actions.savedObject.get('savedObject-read-2', 'close_point_in_time'),
      actions.ui.get('foo', 'ui-1'),
      actions.ui.get('foo', 'ui-2'),
    ]);
  });

  test(`features with no reservedPrivileges aren't listed`, () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        id: 'foo',
        name: 'Foo KibanaFeature',
        app: [],
        category: { id: 'foo', label: 'foo' },
        privileges: {
          all: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['foo'],
          },
          read: {
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['foo'],
          },
        },
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

    const actual = privileges.get();
    expect(actual).not.toHaveProperty('reserved.foo');
  });
});

describe('subFeatures', () => {
  describe(`with includeIn: 'none'`, () => {
    test(`should not augment the primary feature privileges, base privileges, or minimal feature privileges`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'none',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty('foo.all', [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);
      expect(actual.features).toHaveProperty('foo.minimal_all', [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty('foo.read', [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);
      expect(actual.features).toHaveProperty('foo.minimal_read', [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.api.get(ApiOperation.Read, 'features'),
        actions.api.get(ApiOperation.Manage, 'taskManager'),
        actions.api.get(ApiOperation.Manage, 'spaces'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('globalSettings', 'save'),
        actions.ui.get('globalSettings', 'show'),
        actions.ui.get('foo', 'foo'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.ui.get('globalSettings', 'show'),
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('space.all', [actions.login, actions.ui.get('foo', 'foo')]);
      expect(actual).toHaveProperty('space.read', [actions.login, actions.ui.get('foo', 'foo')]);
    });
  });

  describe(`with includeIn: 'read'`, () => {
    test(`should augment the primary feature privileges and base privileges, but never the minimal versions`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.api.get(ApiOperation.Read, 'features'),
        actions.api.get(ApiOperation.Manage, 'taskManager'),
        actions.api.get(ApiOperation.Manage, 'spaces'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('globalSettings', 'save'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
    });

    test(`should augment the primary feature privileges, but not base privileges if feature is excluded from them.`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          excludeFromBasePrivileges: true,
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.api.get(ApiOperation.Read, 'features'),
        actions.api.get(ApiOperation.Manage, 'taskManager'),
        actions.api.get(ApiOperation.Manage, 'spaces'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('globalSettings', 'save'),
        actions.ui.get('globalSettings', 'show'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.ui.get('globalSettings', 'show'),
      ]);

      expect(actual).toHaveProperty('space.all', [actions.login]);
      expect(actual).toHaveProperty('space.read', [actions.login]);
    });
  });

  describe(`with includeIn: 'all'`, () => {
    test(`should augment the primary 'all' feature privileges and base 'all' privileges, but never the minimal versions`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'all',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.api.get(ApiOperation.Read, 'features'),
        actions.api.get(ApiOperation.Manage, 'taskManager'),
        actions.api.get(ApiOperation.Manage, 'spaces'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('globalSettings', 'save'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.ui.get('globalSettings', 'show'),
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [actions.login, actions.ui.get('foo', 'foo')]);
    });

    test(`should augment the primary 'all' feature privileges, but not the base privileges if the feature is excluded from them`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          excludeFromBasePrivileges: true,
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'all',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.api.get(ApiOperation.Read, 'features'),
        actions.api.get(ApiOperation.Manage, 'taskManager'),
        actions.api.get(ApiOperation.Manage, 'spaces'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('globalSettings', 'save'),
        actions.ui.get('globalSettings', 'show'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.ui.get('globalSettings', 'show'),
      ]);

      expect(actual).toHaveProperty('space.all', [actions.login]);
      expect(actual).toHaveProperty('space.read', [actions.login]);
    });
  });

  describe(`when license does not allow sub features`, () => {
    test(`should augment the primary feature privileges, and should not create sub-feature privileges`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

      const actual = privileges.get();
      expect(actual.features).not.toHaveProperty(`foo.subFeaturePriv1`);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.api.get(ApiOperation.Read, 'features'),
        actions.api.get(ApiOperation.Manage, 'taskManager'),
        actions.api.get(ApiOperation.Manage, 'spaces'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('globalSettings', 'save'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
    });

    test(`should get the sub-feature privileges if 'respectLicenseLevel' is false`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceBasic);

      const actual = privileges.get(false);
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.api.get(ApiOperation.Read, 'features'),
        actions.api.get(ApiOperation.Manage, 'taskManager'),
        actions.api.get(ApiOperation.Manage, 'spaces'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('globalSettings', 'save'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
    });
  });

  describe(`when license allows subfeatures, but not a specific sub feature`, () => {
    test(`should create minimal privileges, but not augment the primary feature privileges or create the disallowed sub-feature privileges`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'licensedSubFeaturePriv',
                      name: 'licensed sub feature priv',
                      includeIn: 'read',
                      minimumLicense: 'platinum',
                      savedObject: {
                        all: ['all-licensed-sub-feature-type'],
                        read: ['read-licensed-sub-feature-type'],
                      },
                      ui: ['licensed-sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`);
      expect(actual.features).not.toHaveProperty(`foo.licensedSubFeaturePriv`);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.api.get(ApiOperation.Read, 'features'),
        actions.api.get(ApiOperation.Manage, 'taskManager'),
        actions.api.get(ApiOperation.Manage, 'spaces'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('globalSettings', 'save'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
      ]);
    });
  });

  describe(`when license allows subfeatures, but and a licensed sub feature`, () => {
    test(`should create minimal privileges, augment the primary feature privileges, and create the licensed sub-feature privileges`, () => {
      const features: KibanaFeature[] = [
        new KibanaFeature({
          id: 'foo',
          name: 'Foo KibanaFeature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
            read: {
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['foo'],
            },
          },
          subFeatures: [
            {
              name: 'subFeature1',
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'subFeaturePriv1',
                      name: 'sub feature priv 1',
                      includeIn: 'read',
                      savedObject: {
                        all: ['all-sub-feature-type'],
                        read: ['read-sub-feature-type'],
                      },
                      ui: ['sub-feature-ui'],
                    },
                  ],
                },
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'licensedSubFeaturePriv',
                      name: 'licensed sub feature priv',
                      includeIn: 'read',
                      minimumLicense: 'platinum',
                      savedObject: {
                        all: ['all-licensed-sub-feature-type'],
                        read: ['read-licensed-sub-feature-type'],
                      },
                      ui: ['licensed-sub-feature-ui'],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ];

      const mockFeaturesPlugin = featuresPluginMock.createSetup();
      mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
      const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServicePlatinum);

      const actual = privileges.get();
      expect(actual.features).toHaveProperty(`foo.subFeaturePriv1`);
      expect(actual.features).toHaveProperty(`foo.licensedSubFeaturePriv`);

      expect(actual.features).toHaveProperty(`foo.all`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_all`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual.features).toHaveProperty(`foo.read`, [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);

      expect(actual.features).toHaveProperty(`foo.minimal_read`, [
        actions.login,
        actions.ui.get('foo', 'foo'),
      ]);

      expect(actual).toHaveProperty('global.all', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.api.get(ApiOperation.Read, 'features'),
        actions.api.get(ApiOperation.Manage, 'taskManager'),
        actions.api.get(ApiOperation.Manage, 'spaces'),
        actions.space.manage,
        actions.ui.get('spaces', 'manage'),
        actions.ui.get('management', 'kibana', 'spaces'),
        actions.ui.get('catalogue', 'spaces'),
        actions.ui.get('enterpriseSearch', 'all'),
        actions.ui.get('globalSettings', 'save'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('global.read', [
        actions.login,
        actions.api.get(ApiOperation.Read, 'decryptedTelemetry'),
        actions.ui.get('globalSettings', 'show'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);

      expect(actual).toHaveProperty('space.all', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);
      expect(actual).toHaveProperty('space.read', [
        actions.login,
        actions.savedObject.get('all-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-sub-feature-type', 'get'),
        actions.savedObject.get('all-sub-feature-type', 'find'),
        actions.savedObject.get('all-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-sub-feature-type', 'create'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-sub-feature-type', 'update'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-sub-feature-type', 'delete'),
        actions.savedObject.get('all-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_create'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_update'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'bulk_delete'),
        actions.savedObject.get('all-licensed-sub-feature-type', 'share_to_space'),
        actions.savedObject.get('read-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-sub-feature-type', 'get'),
        actions.savedObject.get('read-sub-feature-type', 'find'),
        actions.savedObject.get('read-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-sub-feature-type', 'close_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'bulk_get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'get'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'find'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'open_point_in_time'),
        actions.savedObject.get('read-licensed-sub-feature-type', 'close_point_in_time'),
        actions.ui.get('foo', 'foo'),
        actions.ui.get('foo', 'sub-feature-ui'),
        actions.ui.get('foo', 'licensed-sub-feature-ui'),
      ]);
    });
  });

  test('actions should respect `replacedBy` specified by the deprecated sub-feature privileges', () => {
    const features: KibanaFeature[] = [
      new KibanaFeature({
        deprecated: { notice: 'It is deprecated, sorry.' },
        id: 'alpha',
        name: 'Feature Alpha',
        app: [],
        category: { id: 'alpha', label: 'alpha' },
        privileges: {
          all: {
            savedObject: {
              all: ['all-alpha-all-so'],
              read: ['all-alpha-read-so'],
            },
            ui: ['all-alpha-ui'],
            app: ['all-alpha-app'],
            api: ['all-alpha-api'],
            replacedBy: [{ feature: 'beta', privileges: ['all'] }],
          },
          read: {
            savedObject: {
              all: ['read-alpha-all-so'],
              read: ['read-alpha-read-so'],
            },
            ui: ['read-alpha-ui'],
            app: ['read-alpha-app'],
            api: ['read-alpha-api'],
            replacedBy: {
              default: [{ feature: 'beta', privileges: ['read', 'sub_beta'] }],
              minimal: [{ feature: 'beta', privileges: ['minimal_read'] }],
            },
          },
        },
        subFeatures: [
          {
            name: 'sub-feature-alpha',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'sub_alpha',
                    name: 'Sub Feature Alpha',
                    includeIn: 'all',
                    savedObject: {
                      all: ['sub-alpha-all-so'],
                      read: ['sub-alpha-read-so'],
                    },
                    ui: ['sub-alpha-ui'],
                    app: ['sub-alpha-app'],
                    api: ['sub-alpha-api'],
                    replacedBy: [
                      { feature: 'beta', privileges: ['minimal_read'] },
                      { feature: 'beta', privileges: ['sub_beta'] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      new KibanaFeature({
        id: 'beta',
        name: 'Feature Beta',
        app: [],
        category: { id: 'beta', label: 'beta' },
        privileges: {
          all: {
            savedObject: {
              all: ['all-beta-all-so'],
              read: ['all-beta-read-so'],
            },
            ui: ['all-beta-ui'],
            app: ['all-beta-app'],
            api: ['all-beta-api'],
          },
          read: {
            savedObject: {
              all: ['read-beta-all-so'],
              read: ['read-beta-read-so'],
            },
            ui: ['read-beta-ui'],
            app: ['read-beta-app'],
            api: ['read-beta-api'],
          },
        },
        subFeatures: [
          {
            name: 'sub-feature-beta',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'sub_beta',
                    name: 'Sub Feature Beta',
                    includeIn: 'all',
                    savedObject: {
                      all: ['sub-beta-all-so'],
                      read: ['sub-beta-read-so'],
                    },
                    ui: ['sub-beta-ui'],
                    app: ['sub-beta-app'],
                    api: ['sub-beta-api'],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ];

    const mockFeaturesPlugin = featuresPluginMock.createSetup();
    mockFeaturesPlugin.getKibanaFeatures.mockReturnValue(features);
    const privileges = privilegesFactory(actions, mockFeaturesPlugin, mockLicenseServiceGold);

    const expectedAllPrivileges = [
      actions.login,
      actions.api.get('all-alpha-api'),
      actions.api.get('sub-alpha-api'),
      actions.app.get('all-alpha-app'),
      actions.app.get('sub-alpha-app'),
      actions.ui.get('navLinks', 'all-alpha-app'),
      actions.ui.get('navLinks', 'sub-alpha-app'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_get'),
      actions.savedObject.get('all-alpha-all-so', 'get'),
      actions.savedObject.get('all-alpha-all-so', 'find'),
      actions.savedObject.get('all-alpha-all-so', 'open_point_in_time'),
      actions.savedObject.get('all-alpha-all-so', 'close_point_in_time'),
      actions.savedObject.get('all-alpha-all-so', 'create'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_create'),
      actions.savedObject.get('all-alpha-all-so', 'update'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_update'),
      actions.savedObject.get('all-alpha-all-so', 'delete'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_delete'),
      actions.savedObject.get('all-alpha-all-so', 'share_to_space'),
      actions.savedObject.get('sub-alpha-all-so', 'bulk_get'),
      actions.savedObject.get('sub-alpha-all-so', 'get'),
      actions.savedObject.get('sub-alpha-all-so', 'find'),
      actions.savedObject.get('sub-alpha-all-so', 'open_point_in_time'),
      actions.savedObject.get('sub-alpha-all-so', 'close_point_in_time'),
      actions.savedObject.get('sub-alpha-all-so', 'create'),
      actions.savedObject.get('sub-alpha-all-so', 'bulk_create'),
      actions.savedObject.get('sub-alpha-all-so', 'update'),
      actions.savedObject.get('sub-alpha-all-so', 'bulk_update'),
      actions.savedObject.get('sub-alpha-all-so', 'delete'),
      actions.savedObject.get('sub-alpha-all-so', 'bulk_delete'),
      actions.savedObject.get('sub-alpha-all-so', 'share_to_space'),
      actions.savedObject.get('all-alpha-read-so', 'bulk_get'),
      actions.savedObject.get('all-alpha-read-so', 'get'),
      actions.savedObject.get('all-alpha-read-so', 'find'),
      actions.savedObject.get('all-alpha-read-so', 'open_point_in_time'),
      actions.savedObject.get('all-alpha-read-so', 'close_point_in_time'),
      actions.savedObject.get('sub-alpha-read-so', 'bulk_get'),
      actions.savedObject.get('sub-alpha-read-so', 'get'),
      actions.savedObject.get('sub-alpha-read-so', 'find'),
      actions.savedObject.get('sub-alpha-read-so', 'open_point_in_time'),
      actions.savedObject.get('sub-alpha-read-so', 'close_point_in_time'),
      actions.ui.get('alpha', 'all-alpha-ui'),
      actions.ui.get('alpha', 'sub-alpha-ui'),
      // To maintain compatibility with the new UI capabilities that are feature specific:
      // all.replacedBy: [{ feature: 'beta', privileges: ['all'] }],
      actions.ui.get('navLinks', 'all-beta-app'),
      actions.ui.get('navLinks', 'sub-beta-app'),
      actions.ui.get('beta', 'all-beta-ui'),
      actions.ui.get('beta', 'sub-beta-ui'),
    ];

    const expectedMinimalAllPrivileges = [
      actions.login,
      actions.api.get('all-alpha-api'),
      actions.app.get('all-alpha-app'),
      actions.ui.get('navLinks', 'all-alpha-app'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_get'),
      actions.savedObject.get('all-alpha-all-so', 'get'),
      actions.savedObject.get('all-alpha-all-so', 'find'),
      actions.savedObject.get('all-alpha-all-so', 'open_point_in_time'),
      actions.savedObject.get('all-alpha-all-so', 'close_point_in_time'),
      actions.savedObject.get('all-alpha-all-so', 'create'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_create'),
      actions.savedObject.get('all-alpha-all-so', 'update'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_update'),
      actions.savedObject.get('all-alpha-all-so', 'delete'),
      actions.savedObject.get('all-alpha-all-so', 'bulk_delete'),
      actions.savedObject.get('all-alpha-all-so', 'share_to_space'),
      actions.savedObject.get('all-alpha-read-so', 'bulk_get'),
      actions.savedObject.get('all-alpha-read-so', 'get'),
      actions.savedObject.get('all-alpha-read-so', 'find'),
      actions.savedObject.get('all-alpha-read-so', 'open_point_in_time'),
      actions.savedObject.get('all-alpha-read-so', 'close_point_in_time'),
      actions.ui.get('alpha', 'all-alpha-ui'),
      // To maintain compatibility with the new UI capabilities that are feature specific.
      // Actions from the beta feature top-level and sub-feature privileges are included because
      // used simple `replacedBy` format:
      // all.replacedBy: [{ feature: 'beta', privileges: ['all'] }],
      actions.ui.get('navLinks', 'all-beta-app'),
      actions.ui.get('navLinks', 'sub-beta-app'),
      actions.ui.get('beta', 'all-beta-ui'),
      actions.ui.get('beta', 'sub-beta-ui'),
    ];

    const expectedReadPrivileges = [
      actions.login,
      actions.api.get('read-alpha-api'),
      actions.app.get('read-alpha-app'),
      actions.ui.get('navLinks', 'read-alpha-app'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_get'),
      actions.savedObject.get('read-alpha-all-so', 'get'),
      actions.savedObject.get('read-alpha-all-so', 'find'),
      actions.savedObject.get('read-alpha-all-so', 'open_point_in_time'),
      actions.savedObject.get('read-alpha-all-so', 'close_point_in_time'),
      actions.savedObject.get('read-alpha-all-so', 'create'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_create'),
      actions.savedObject.get('read-alpha-all-so', 'update'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_update'),
      actions.savedObject.get('read-alpha-all-so', 'delete'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_delete'),
      actions.savedObject.get('read-alpha-all-so', 'share_to_space'),
      actions.savedObject.get('read-alpha-read-so', 'bulk_get'),
      actions.savedObject.get('read-alpha-read-so', 'get'),
      actions.savedObject.get('read-alpha-read-so', 'find'),
      actions.savedObject.get('read-alpha-read-so', 'open_point_in_time'),
      actions.savedObject.get('read-alpha-read-so', 'close_point_in_time'),
      actions.ui.get('alpha', 'read-alpha-ui'),
      // To maintain compatibility with the new UI capabilities that are feature specific:
      // read.replacedBy: {
      //   default: [{ feature: 'beta', privileges: ['read', 'sub_beta'] }]
      // },
      actions.ui.get('navLinks', 'read-beta-app'),
      actions.ui.get('beta', 'read-beta-ui'),
      actions.ui.get('navLinks', 'sub-beta-app'),
      actions.ui.get('beta', 'sub-beta-ui'),
    ];

    const expectedMinimalReadPrivileges = [
      actions.login,
      actions.api.get('read-alpha-api'),
      actions.app.get('read-alpha-app'),
      actions.ui.get('navLinks', 'read-alpha-app'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_get'),
      actions.savedObject.get('read-alpha-all-so', 'get'),
      actions.savedObject.get('read-alpha-all-so', 'find'),
      actions.savedObject.get('read-alpha-all-so', 'open_point_in_time'),
      actions.savedObject.get('read-alpha-all-so', 'close_point_in_time'),
      actions.savedObject.get('read-alpha-all-so', 'create'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_create'),
      actions.savedObject.get('read-alpha-all-so', 'update'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_update'),
      actions.savedObject.get('read-alpha-all-so', 'delete'),
      actions.savedObject.get('read-alpha-all-so', 'bulk_delete'),
      actions.savedObject.get('read-alpha-all-so', 'share_to_space'),
      actions.savedObject.get('read-alpha-read-so', 'bulk_get'),
      actions.savedObject.get('read-alpha-read-so', 'get'),
      actions.savedObject.get('read-alpha-read-so', 'find'),
      actions.savedObject.get('read-alpha-read-so', 'open_point_in_time'),
      actions.savedObject.get('read-alpha-read-so', 'close_point_in_time'),
      actions.ui.get('alpha', 'read-alpha-ui'),
      // To maintain compatibility with the new UI capabilities that are feature specific:
      // read.replacedBy: {
      //   minimal: [{ feature: 'beta', privileges: ['minimal_read'] }],
      // },
      actions.ui.get('navLinks', 'read-beta-app'),
      actions.ui.get('beta', 'read-beta-ui'),
    ];

    const expectedSubFeaturePrivileges = [
      actions.login,
      actions.api.get('sub-alpha-api'),
      actions.app.get('sub-alpha-app'),
      actions.ui.get('navLinks', 'sub-alpha-app'),
      actions.savedObject.get('sub-alpha-all-so', 'bulk_get'),
      actions.savedObject.get('sub-alpha-all-so', 'get'),
      actions.savedObject.get('sub-alpha-all-so', 'find'),
      actions.savedObject.get('sub-alpha-all-so', 'open_point_in_time'),
      actions.savedObject.get('sub-alpha-all-so', 'close_point_in_time'),
      actions.savedObject.get('sub-alpha-all-so', 'create'),
      actions.savedObject.get('sub-alpha-all-so', 'bulk_create'),
      actions.savedObject.get('sub-alpha-all-so', 'update'),
      actions.savedObject.get('sub-alpha-all-so', 'bulk_update'),
      actions.savedObject.get('sub-alpha-all-so', 'delete'),
      actions.savedObject.get('sub-alpha-all-so', 'bulk_delete'),
      actions.savedObject.get('sub-alpha-all-so', 'share_to_space'),
      actions.savedObject.get('sub-alpha-read-so', 'bulk_get'),
      actions.savedObject.get('sub-alpha-read-so', 'get'),
      actions.savedObject.get('sub-alpha-read-so', 'find'),
      actions.savedObject.get('sub-alpha-read-so', 'open_point_in_time'),
      actions.savedObject.get('sub-alpha-read-so', 'close_point_in_time'),
      actions.ui.get('alpha', 'sub-alpha-ui'),
      // To maintain compatibility with the new UI capabilities that are feature specific:
      // sub_alpha.replacedBy: [
      //   { feature: 'beta', privileges: ['minimal_read'] },
      //   { feature: 'beta', privileges: ['sub_beta'] },
      // ],
      actions.ui.get('navLinks', 'read-beta-app'),
      actions.ui.get('beta', 'read-beta-ui'),
      actions.ui.get('navLinks', 'sub-beta-app'),
      actions.ui.get('beta', 'sub-beta-ui'),
    ];

    const actual = privileges.get();
    expect(actual).toHaveProperty('features.alpha', {
      all: expectedAllPrivileges,
      read: expectedReadPrivileges,
      minimal_all: expectedMinimalAllPrivileges,
      minimal_read: expectedMinimalReadPrivileges,
      sub_alpha: expectedSubFeaturePrivileges,
    });
  });
});

describe('#getReplacedByForPrivilege', () => {
  test('correctly gets `replacedBy` with simple format', () => {
    const basePrivilege = { savedObject: { all: [], read: [] }, ui: [] };
    expect(getReplacedByForPrivilege('all', basePrivilege)).toBeUndefined();
    expect(getReplacedByForPrivilege('minimal_all', basePrivilege)).toBeUndefined();

    const privilegeWithReplacedBy = {
      ...basePrivilege,
      replacedBy: [{ feature: 'alpha', privileges: ['all', 'read'] }],
    };
    expect(getReplacedByForPrivilege('all', privilegeWithReplacedBy)).toEqual([
      { feature: 'alpha', privileges: ['all', 'read'] },
    ]);
    expect(getReplacedByForPrivilege('minimal_all', privilegeWithReplacedBy)).toEqual([
      { feature: 'alpha', privileges: ['all', 'read'] },
    ]);
    expect(getReplacedByForPrivilege('custom', privilegeWithReplacedBy)).toEqual([
      { feature: 'alpha', privileges: ['all', 'read'] },
    ]);
  });

  test('correctly gets `replacedBy` with extended format', () => {
    const basePrivilege = { savedObject: { all: [], read: [] }, ui: [] };
    expect(getReplacedByForPrivilege('all', basePrivilege)).toBeUndefined();
    expect(getReplacedByForPrivilege('minimal_all', basePrivilege)).toBeUndefined();

    const privilegeWithReplacedBy = {
      ...basePrivilege,
      replacedBy: {
        default: [{ feature: 'alpha', privileges: ['all', 'read', 'custom'] }],
        minimal: [{ feature: 'alpha', privileges: ['minimal_all'] }],
      },
    };
    expect(getReplacedByForPrivilege('all', privilegeWithReplacedBy)).toEqual([
      { feature: 'alpha', privileges: ['all', 'read', 'custom'] },
    ]);
    expect(getReplacedByForPrivilege('custom', privilegeWithReplacedBy)).toEqual([
      { feature: 'alpha', privileges: ['all', 'read', 'custom'] },
    ]);
    expect(getReplacedByForPrivilege('minimal_all', privilegeWithReplacedBy)).toEqual([
      { feature: 'alpha', privileges: ['minimal_all'] },
    ]);
  });
});
