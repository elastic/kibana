/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDeprecatedApmIndices, isLegacyApmIndex } from './index';

function mockedCallWithRequest() {
  return jest.fn().mockImplementation(async () => {
    return {
      'foo-1': {
        mappings: {},
      },
      'foo-2': {
        mappings: {
          _meta: {
            version: '6.7.0',
          },
        },
      },
      'foo-3': {
        mappings: {
          _meta: {
            version: '7.0.0',
          },
        },
      },
      'foo-4': {
        mappings: {
          _meta: {
            version: '7.1.0',
          },
        },
      },
    };
  });
}

describe('getDeprecatedApmIndices', () => {
  it('calls indices.getMapping', async () => {
    const callWithRequest = mockedCallWithRequest();
    await getDeprecatedApmIndices(callWithRequest, {} as any, ['foo-*', 'bar-*']);

    expect(callWithRequest).toHaveBeenCalledWith({}, 'indices.getMapping', {
      index: 'foo-*,bar-*',
      filterPath: '*.mappings._meta.version,*.mappings.properties.@timestamp',
    });
  });

  it('includes mappings not yet at 7.0.0', async () => {
    const callWithRequest = mockedCallWithRequest();
    const deprecations = await getDeprecatedApmIndices(callWithRequest, {} as any, ['foo-*']);

    expect(deprecations).toHaveLength(2);
    expect(deprecations[0].index).toEqual('foo-1');
    expect(deprecations[1].index).toEqual('foo-2');
  });

  it('formats the deprecations', async () => {
    const callWithRequest = mockedCallWithRequest();
    // @ts-ignore
    const [deprecation, _] = await getDeprecatedApmIndices(callWithRequest, {} as any, ['foo-*']);

    expect(deprecation.level).toEqual('warning');
    expect(deprecation.message).toEqual('APM index requires conversion to 7.x format');
    expect(deprecation.url).toEqual(
      'https://www.elastic.co/guide/en/apm/get-started/master/apm-release-notes.html'
    );
    expect(deprecation.details).toEqual('This index was created prior to 7.0');
    expect(deprecation.reindex).toBe(true);
  });
});

describe('isLegacyApmIndex', () => {
  it('is true when for no version', () => {
    expect(isLegacyApmIndex('foo-1', ['foo-*'], {})).toEqual(true);
  });

  it('is true when version is less than 7.0.0', () => {
    expect(
      isLegacyApmIndex('foo-1', ['foo-*'], {
        _meta: { version: '6.7.0' },
      })
    ).toEqual(true);
  });

  it('is false when version is 7.0.0', () => {
    expect(
      isLegacyApmIndex('foo-1', ['foo-*'], {
        _meta: { version: '7.0.0' },
      })
    ).toEqual(false);
  });

  it('is false when version is greater than 7.0.0', () => {
    expect(
      isLegacyApmIndex('foo-1', ['foo-*'], {
        _meta: { version: '7.1.0' },
      })
    ).toEqual(false);
  });

  it('is false when using a version qualifier', () => {
    expect(
      isLegacyApmIndex('foo-1', ['foo-*'], {
        _meta: { version: '7.0.0-rc1' },
      })
    ).toEqual(false);
  });

  it('handles multiple index patterns', () => {
    expect(
      isLegacyApmIndex('bar-1', ['foo-*', 'bar-*'], {
        _meta: { version: '6.7.0' },
      })
    ).toEqual(true);

    expect(
      isLegacyApmIndex('bar-1', ['foo-*', 'bar-*'], {
        _meta: { version: '7.0.0' },
      })
    ).toEqual(false);
  });
});
