/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sortTransformsToReauthorize } from './sort_transforms_to_reauthorize';

describe('sortTransformsToReauthorize', () => {
  test('should work with multiple transforms with or without config or _meta defined', () => {
    const transforms = [
      {
        id: 'transform0',
        config: {},
      },
      {
        id: 'transformA-2',
        config: {
          _meta: {
            run_as_kibana_system: false,
            managed_by: 'fleet',
            managed: true,
            order: 2,
            package: {
              name: 'packageA',
            },
            installed_by: 'transform_user',
          },
        },
      },
      {
        id: 'transformA-0',
        config: {
          _meta: {
            run_as_kibana_system: false,
            managed_by: 'fleet',
            managed: true,
            package: {
              name: 'packageA',
            },
            installed_by: 'transform_user',
          },
        },
      },
      {
        id: 'transformB-2',
        config: {
          _meta: {
            run_as_kibana_system: false,
            managed_by: 'fleet',
            managed: true,
            order: 2,
            package: {
              name: 'packageB',
            },
            installed_by: 'transform_user',
          },
        },
      },
      {
        id: 'transformB-1',
        config: {
          _meta: {
            run_as_kibana_system: false,
            managed_by: 'fleet',
            managed: true,
            order: 1,
            package: {
              name: 'packageB',
            },
            installed_by: 'transform_user',
          },
        },
      },
    ];
    // @ts-ignore transforms is partial of TransformListRow
    const { transformIds, shouldInstallSequentially } = sortTransformsToReauthorize(transforms);
    expect(transformIds.map((t) => t.id)).toEqual([
      'transform0',
      'transformA-0',
      'transformA-2',
      'transformB-1',
      'transformB-2',
    ]);
    expect(shouldInstallSequentially).toEqual(true);
  });

  test('should return shouldInstallSequentially: false if none of the transforms have order specified', () => {
    const transforms = [
      {
        id: 'transform3',
        config: {},
      },
      {
        id: 'transform2',
        config: {},
      },
      {
        id: 'transform1',
        config: {},
      },
    ];
    // @ts-ignore transforms is partial of TransformListRow
    const { transformIds, shouldInstallSequentially } = sortTransformsToReauthorize(transforms);
    expect(transformIds.map((t) => t.id)).toEqual(['transform3', 'transform2', 'transform1']);
    expect(shouldInstallSequentially).toEqual(false);
  });
});
