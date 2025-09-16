/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryDataStream, RegistryPolicyTemplate } from '../../../../common';

import {
  filterOutExcludedDataStreamTypes,
  shouldIncludePackageWithDatastreamTypes,
} from './exclude_datastreams_helper';

describe('shouldIncludePackageWithDatastreamTypes', () => {
  it('should not exclude package without datastreams', () => {
    const pkg = {
      id: 'test.package',
      data_streams: [],
    };
    const excludeDataStreamTypes = ['metrics'];
    const result = shouldIncludePackageWithDatastreamTypes(pkg, excludeDataStreamTypes);
    expect(result).toBe(true);
  });

  it('should not exclude package with excluded and non excluded datastreams type', () => {
    const pkg = {
      id: 'test.package',
      data_streams: [{ type: 'logs' }, { type: 'metrics' }],
    };
    const excludeDataStreamTypes = ['metrics'];
    const result = shouldIncludePackageWithDatastreamTypes(pkg, excludeDataStreamTypes);
    expect(result).toBe(true);
  });

  it('should exclude package with only excluded datastreams type', () => {
    const pkg = {
      id: 'test.package',
      data_streams: [{ type: 'metrics' }],
    };
    const excludeDataStreamTypes = ['metrics'];
    const result = shouldIncludePackageWithDatastreamTypes(pkg, excludeDataStreamTypes);
    expect(result).toBe(false);
  });
});

describe('filterOutExcludedDataStreamTypes', () => {
  it('should not filter out datastreams and policy template without excluded datastreams type', () => {
    const excludeDataStreamTypes = ['metrics'];
    const res = filterOutExcludedDataStreamTypes(
      [
        {
          name: 'aws',
          data_streams: [{ type: 'logs', dataset: 'aws.logs' } as RegistryDataStream],
          policy_templates: [
            {
              title: 'Logs',
              data_streams: ['logs'],
            } as RegistryPolicyTemplate,
          ],
        } as any,
      ],
      excludeDataStreamTypes
    );

    expect(res).toEqual([
      {
        name: 'aws',
        data_streams: [{ type: 'logs', dataset: 'aws.logs' }],
        policy_templates: [
          {
            title: 'Logs',
            data_streams: ['logs'],
          },
        ],
      },
    ]);
  });

  it('should not filter out datastreams and policy template with excluded and non excluded datastreams type', () => {
    const excludeDataStreamTypes = ['metrics'];
    const res = filterOutExcludedDataStreamTypes(
      [
        {
          name: 'aws',
          data_streams: [
            { type: 'logs', dataset: 'aws.logs' } as RegistryDataStream,
            { type: 'metrics', dataset: 'aws.metrics' } as RegistryDataStream,
          ],
          policy_templates: [
            {
              title: 'Logs',
              data_streams: ['logs'],
            } as RegistryPolicyTemplate,
            {
              title: 'Mix',
              data_streams: ['logs', 'metrics'],
            } as RegistryPolicyTemplate,
          ],
        } as any,
      ],
      excludeDataStreamTypes
    );

    expect(res).toEqual([
      {
        name: 'aws',
        data_streams: [{ type: 'logs', dataset: 'aws.logs' }],
        policy_templates: [
          {
            title: 'Logs',
            data_streams: ['logs'],
          },
          {
            title: 'Mix',
            data_streams: ['logs', 'metrics'],
          },
        ],
      },
    ]);
  });

  it('should filter out datastreams and policy template with only excluded datastreams type', () => {
    const excludeDataStreamTypes = ['metrics'];
    const res = filterOutExcludedDataStreamTypes(
      [
        {
          name: 'aws',
          data_streams: [
            { type: 'logs', dataset: 'aws.logs' } as RegistryDataStream,
            { type: 'metrics', dataset: 'aws.metrics' } as RegistryDataStream,
          ],
          policy_templates: [
            {
              title: 'Logs',
              data_streams: ['logs'],
            } as RegistryPolicyTemplate,
            {
              title: 'Metrics',
              data_streams: ['metrics'],
            } as RegistryPolicyTemplate,
          ],
        } as any,
      ],
      excludeDataStreamTypes
    );

    expect(res).toEqual([
      {
        name: 'aws',
        data_streams: [{ type: 'logs', dataset: 'aws.logs' }],
        policy_templates: [
          {
            title: 'Logs',
            data_streams: ['logs'],
          },
        ],
      },
    ]);
  });
});
