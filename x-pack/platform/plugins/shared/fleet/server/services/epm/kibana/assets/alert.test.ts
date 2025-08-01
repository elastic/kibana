/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaSavedObjectType } from '../../../../types';

import { fillAlertDefaults } from './alert';

describe('fillAlertDefaults', () => {
  it('should fill in default values for alert saved object', () => {
    const alertSo = {
      id: 'test-alert',
      type: KibanaSavedObjectType.alert,
      attributes: {
        name: 'Test Alert',
      },
      executionStatus: {
        status: 'ok',
        lastExecutionDate: '2023-10-01T00:00:00Z',
      },
    };

    const context = {
      pkgName: 'test-package',
      spaceId: 'default',
      assetTags: [],
    };

    const result = fillAlertDefaults(alertSo, context);

    expect(result.id).toBe('test-alert');
    expect((result.attributes as Record<string, unknown>).name).toBe('Test Alert');
    expect(result.attributes.enabled).toBe(false);
    expect(result.attributes.revision).toBe(0);
    expect(result.attributes.executionStatus.status).toBe('pending');
    expect(result.attributes.createdAt).toBeDefined();
    expect(result.attributes.updatedAt).toBeDefined();
    expect(result.attributes.running).toBe(false);
    expect(result.attributes.tags).toEqual([
      'fleet-pkg-test-package-default',
      'fleet-managed-default',
    ]);
  });
  it('should include existing tags with default tags', () => {
    const alertSo = {
      id: 'test-alert',
      type: KibanaSavedObjectType.alert,
      attributes: {
        name: 'Test Alert',
        tags: ['existing-tag'],
      },
    };

    const context = {
      pkgName: 'test-package',
      spaceId: 'default',
      assetTags: [],
    };

    const result = fillAlertDefaults(alertSo, context);

    expect(result.attributes.tags).toEqual([
      'existing-tag',
      'fleet-pkg-test-package-default',
      'fleet-managed-default',
    ]);
  });
  it('should include tags from assetTags if they match', () => {
    const alertSo = {
      id: 'test-alert',
      type: KibanaSavedObjectType.alert,
      attributes: {
        name: 'Test Alert',
      },
    };

    const context = {
      pkgName: 'test-package',
      spaceId: 'default',
      assetTags: [
        { text: 'alert-specific-tag', asset_types: ['alert'] },
        { text: 'other-asset-tag', asset_types: ['dashboard'] },
        { text: 'id-specific-tag', asset_ids: ['test-alert'] },
        { text: 'not-matching-id-tag', asset_ids: ['other-alert'] },
      ],
    };

    const result = fillAlertDefaults(alertSo, context);

    expect(result.attributes.tags).toEqual([
      'fleet-pkg-test-package-default',
      'fleet-managed-default',
      'alert-specific-tag',
      'id-specific-tag',
    ]);
  });
});
