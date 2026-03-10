/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import {
  FleetError,
  PackageNotFoundError,
  RegistryConnectionError,
  RegistryResponseError,
} from '../../../errors';
import * as Archive from '../archive';

import {
  splitPkgKey,
  fetchFindLatestPackageOrUndefined,
  fetchFindLatestPackageOrThrow,
  fetchInfo,
  getLicensePath,
  fetchCategories,
  fetchList,
  getPackage,
} from '.';

const mockLogger = loggingSystemMock.create().get();

const mockGetConfig = jest.fn();

const mockGetBundledPackageByName = jest.fn();
const mockFetchUrl = jest.fn();
const mockGetResponseStreamWithSize = jest.fn();
const mockStreamToBuffer = jest.fn();
const mockVerifyPackageArchiveSignature = jest.fn();
const mockGetPackageAssetsMapCache = jest.fn();

const MockArchive = Archive as jest.Mocked<typeof Archive>;

jest.mock('../archive');
jest.mock('./requests');
jest.mock('../streams');
jest.mock('../packages/cache');

jest.mock('../..', () => ({
  appContextService: {
    getLogger: () => mockLogger,
    getKibanaBranch: () => 'main',
    getKibanaVersion: () => '99.0.0',
    getConfig: () => mockGetConfig(),
    getIsProductionMode: () => false,
  },
}));

jest.mock('./requests', () => ({
  fetchUrl: (url: string) => mockFetchUrl(url),
  getResponseStreamWithSize: (url: string) => mockGetResponseStreamWithSize(url),
}));

jest.mock('../streams', () => ({
  streamToBuffer: (stream: NodeJS.ReadableStream, size?: number) =>
    mockStreamToBuffer(stream, size),
}));

jest.mock('../packages/bundled_packages', () => ({
  getBundledPackageByName: (name: string) => mockGetBundledPackageByName(name),
}));

jest.mock('../packages/package_verification', () => ({
  verifyPackageArchiveSignature: (
    pkgName: string,
    pkgVersion: string,
    pkgArchiveBuffer: Buffer | undefined,
    logger: Logger
  ) => mockVerifyPackageArchiveSignature(pkgName, pkgVersion, pkgArchiveBuffer, logger),
}));

jest.mock('../packages/cache', () => ({
  getPackageAssetsMapCache: () => mockGetPackageAssetsMapCache(),
}));

describe('splitPkgKey', () => {
  it('throws an error if there is nothing before the delimiter', () => {
    expect(() => {
      splitPkgKey('-0.0.1-dev1');
    }).toThrow();
  });

  it('throws an error if the version is not a semver', () => {
    expect(() => {
      splitPkgKey('awesome-laskdfj');
    }).toThrow();
  });

  it('returns name and empty version if no delimiter is found', () => {
    const { pkgName, pkgVersion } = splitPkgKey('awesome_package');
    expect(pkgName).toBe('awesome_package');
    expect(pkgVersion).toBe('');
  });

  it('returns the name and version if the delimiter is found once', () => {
    const { pkgName, pkgVersion } = splitPkgKey('awesome-0.1.0');
    expect(pkgName).toBe('awesome');
    expect(pkgVersion).toBe('0.1.0');
  });

  it('returns the name and version if the delimiter is found multiple times', () => {
    const { pkgName, pkgVersion } = splitPkgKey('endpoint-0.13.0-alpha.1+abcd');
    expect(pkgName).toBe('endpoint');
    expect(pkgVersion).toBe('0.13.0-alpha.1+abcd');
  });
});

describe('fetch package', () => {
  afterEach(() => {
    mockFetchUrl.mockReset();
    mockGetConfig.mockReset();
    mockGetBundledPackageByName.mockReset();
  });

  type FetchFn = typeof fetchFindLatestPackageOrThrow | typeof fetchFindLatestPackageOrUndefined;
  const performGenericFetchTests = (fetchMethodToTest: FetchFn) => {
    it('Should return registry package if bundled package is older version', async () => {
      const bundledPackage = { name: 'testpkg', version: '1.0.0' };
      const registryPackage = { name: 'testpkg', version: '1.0.1' };

      mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchMethodToTest('testpkg');
      expect(result).toEqual(registryPackage);
    });

    it('Should return bundled package when isAirGapped = true', async () => {
      mockGetConfig.mockReturnValue({
        isAirGapped: true,
        enabled: true,
        agents: { enabled: true, elasticsearch: {} },
      });
      const bundledPackage = { name: 'testpkg', version: '1.0.0' };
      const registryPackage = { name: 'testpkg', version: '1.0.1' };

      mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchMethodToTest('testpkg');
      expect(result).toEqual(bundledPackage);
    });

    it('Should return bundled package if bundled package is newer version', async () => {
      const bundledPackage = { name: 'testpkg', version: '1.0.1' };
      const registryPackage = { name: 'testpkg', version: '1.0.0' };

      mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchMethodToTest('testpkg');
      expect(result).toEqual(bundledPackage);
    });
    it('Should return bundled package if there is no registry package', async () => {
      const bundledPackage = { name: 'testpkg', version: '1.0.1' };

      mockFetchUrl.mockResolvedValue(JSON.stringify([]));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchMethodToTest('testpkg');
      expect(result).toEqual(bundledPackage);
    });

    it('Should fall back to bundled package if there is an error getting from the registry', async () => {
      const bundledPackage = { name: 'testpkg', version: '1.0.1' };

      mockFetchUrl.mockRejectedValue(new Error('Registry error'));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchMethodToTest('testpkg');
      expect(result).toEqual(bundledPackage);
    });
  };

  describe('fetchFindLatestPackageOrUndefined', () => {
    performGenericFetchTests(fetchFindLatestPackageOrUndefined);
    it('Should return undefined if there is a registry error and no bundled package', async () => {
      const bundledPackage = null;

      mockFetchUrl.mockRejectedValue(new Error('Registry error'));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
      const result = await fetchFindLatestPackageOrUndefined('testpkg');
      expect(result).toEqual(undefined);
    });
  });

  describe('fetchFindLatestPackageOrThrow', () => {
    performGenericFetchTests(fetchFindLatestPackageOrThrow);
    it('Should return undefined if there is a registry error and no bundled package', async () => {
      const bundledPackage = null;

      mockFetchUrl.mockRejectedValue(new Error('Registry error'));

      mockGetBundledPackageByName.mockResolvedValue(bundledPackage);

      await expect(() => fetchFindLatestPackageOrThrow('testpkg')).rejects.toBeInstanceOf(
        PackageNotFoundError
      );
    });
  });
});

describe('getLicensePath', () => {
  MockArchive.getPathParts = jest.requireActual('../archive').getPathParts;

  it('returns first license path if found', () => {
    const path = getLicensePath([
      '/package/good-1.0.0/NOTICE.txt',
      '/package/good-1.0.0/changelog.yml',
      '/package/good-1.0.0/manifest.yml',
      '/package/good-1.0.0/LICENSE.txt',
      '/package/good-1.0.0/docs/README.md',
    ]);
    expect(path).toEqual('/package/good/1.0.0/LICENSE.txt');
  });

  it('returns undefined if no license', () => {
    const path = getLicensePath([
      '/package/good-1.0.0/NOTICE.txt',
      '/package/good-1.0.0/changelog.yml',
      '/package/good-1.0.0/manifest.yml',
      '/package/good-1.0.0/docs/README.md',
    ]);
    expect(path).toEqual(undefined);
  });
});

describe('fetchInfo', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockFetchUrl.mockRejectedValueOnce(new RegistryResponseError('Not found', 404));
    mockGetBundledPackageByName.mockResolvedValueOnce({
      name: 'test-package',
      version: '1.0.0',
      getBuffer: async () => Buffer.from(''),
    });
    MockArchive.generatePackageInfoFromArchiveBuffer.mockResolvedValueOnce({
      paths: [],
      packageInfo: {
        name: 'test-package',
        title: 'Test Package',
        version: '1.0.0',
        description: 'Test package',
        owner: { github: 'elastic' },
        format_version: '1.0.0',
      },
    });
  });

  it('falls back to bundled package when isAirGapped config == true', async () => {
    mockGetConfig.mockReturnValue({
      isAirGapped: true,
    });

    const fetchedInfo = await fetchInfo('test-package', '1.0.0');
    expect(fetchedInfo).toBeTruthy();
  });

  it('falls back to bundled package when one exists', async () => {
    const fetchedInfo = await fetchInfo('test-package', '1.0.0');
    expect(fetchedInfo).toBeTruthy();
  });

  it('throws when no corresponding bundled package exists', async () => {
    try {
      await fetchInfo('test-package', '1.0.0');
    } catch (e) {
      expect(e).toBeInstanceOf(PackageNotFoundError);
    }
  });
});

describe('fetchCategories', () => {
  beforeEach(() => {
    mockFetchUrl.mockReset();
    mockGetConfig.mockReset();
  });
  it('call registry with capabilities if configured', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          capabilities: ['apm', 'security'],
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchCategories();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('capabilities')).toBe('apm,security');
  });
  it('call registry with spec.min spec.max if configured', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          spec: {
            min: '3.0',
            max: '3.0',
          },
          capabilities: [],
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchCategories();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('spec.min')).toBe('3.0');
    expect(callUrl.searchParams.get('spec.max')).toBe('3.0');
  });
  it('does not call registry with capabilities if none are configured', async () => {
    mockGetConfig.mockReturnValue({});
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchCategories();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('capabilities')).toBeNull();
  });
});

describe('fetchList', () => {
  beforeEach(() => {
    mockFetchUrl.mockReset();
    mockGetConfig.mockReset();
  });
  it('call registry with capabilities if configured', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          capabilities: ['apm', 'security'],
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('capabilities')).toBe('apm,security');
  });
  it('call registry with spec.min spec.max if configured', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          spec: {
            min: '3.0',
            max: '3.0',
          },
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('spec.min')).toBe('3.0');
    expect(callUrl.searchParams.get('spec.max')).toBe('3.0');
  });

  it('does not call registry with capabilities if none are configured', async () => {
    mockGetConfig.mockReturnValue({});
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('capabilities')).toBeNull();
  });

  it('does not call registry if isAirGapped == true', async () => {
    mockGetConfig.mockReturnValue({ isAirGapped: true });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(0);
  });

  it('does call registry with kibana.version if not explictly disabled', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {},
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('kibana.version')).not.toBeNull();
  });

  it('does not call registry with kibana.version with config internal.registry.kibanaVersionCheckEnabled:false', async () => {
    mockGetConfig.mockReturnValue({
      internal: {
        registry: {
          kibanaVersionCheckEnabled: false,
        },
      },
    });
    mockFetchUrl.mockResolvedValue(JSON.stringify([]));
    await fetchList();
    expect(mockFetchUrl).toBeCalledTimes(1);
    const callUrl = new URL(mockFetchUrl.mock.calls[0][0]);
    expect(callUrl.searchParams.get('kibana.version')).toBeNull();
  });
});

describe('getPackage', () => {
  const bundledPackage = {
    name: 'testpkg',
    version: '1.0.0',
    getBuffer: () => Promise.resolve(Buffer.from('testpkg')),
  };
  const registryPackage = {
    name: 'testpkg',
    version: '1.0.1',
    getBuffer: () => Promise.resolve(Buffer.from('testpkg')),
  };
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should return bundled package if isAirGapped = true', async () => {
    mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));
    mockGetResponseStreamWithSize.mockResolvedValue({ stream: {}, size: 1000 });
    mockStreamToBuffer.mockResolvedValue(Buffer.from('testpkg'));
    mockVerifyPackageArchiveSignature.mockResolvedValue('verified');
    mockGetConfig.mockReturnValue({
      isAirGapped: true,
      enabled: true,
      agents: { enabled: true, elasticsearch: {} },
    });
    MockArchive.unpackBufferToAssetsMap.mockReturnValue({
      assetsMap: new Map(),
      paths: [],
      archiveIterator: {},
    } as any);
    MockArchive.generatePackageInfoFromArchiveBuffer.mockReturnValue({
      packageInfo: { name: 'testpkg', version: '1.0.0' },
    } as any);

    mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
    const result = await getPackage('testpkg', '1.0.1');
    expect(result).toEqual({
      archiveIterator: {},
      assetsMap: new Map(),
      packageInfo: {
        name: 'testpkg',
        version: '1.0.0',
      },
      paths: [],
      verificationResult: 'verified',
    });
  });

  it('should return registry package', async () => {
    mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));
    mockGetResponseStreamWithSize.mockResolvedValue({ stream: {}, size: 1000 });
    mockStreamToBuffer.mockResolvedValue(Buffer.from('testpkg'));
    mockVerifyPackageArchiveSignature.mockResolvedValue('verified');
    MockArchive.unpackBufferToAssetsMap.mockReturnValue({
      assetsMap: new Map(),
      paths: [],
      archiveIterator: {},
    } as any);
    MockArchive.generatePackageInfoFromArchiveBuffer.mockReturnValue({
      packageInfo: { name: 'testpkg', version: '1.0.1' },
    } as any);

    mockGetBundledPackageByName.mockResolvedValue(undefined);
    const result = await getPackage('testpkg', '1.0.1');
    expect(result).toEqual({
      archiveIterator: {},
      assetsMap: new Map(),
      packageInfo: {
        name: 'testpkg',
        version: '1.0.1',
      },
      paths: [],
      verificationResult: 'verified',
    });
  });

  it('should throw if there is an error in fetchArchiveBuffer', async () => {
    mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));
    mockGetResponseStreamWithSize.mockRejectedValueOnce(new FleetError('Error fetching package'));
    mockStreamToBuffer.mockResolvedValue(Buffer.from('testpkg'));
    mockVerifyPackageArchiveSignature.mockResolvedValue('verified');
    MockArchive.unpackBufferToAssetsMap.mockReturnValue({
      assetsMap: new Map(),
      paths: [],
      archiveIterator: {},
    } as any);
    MockArchive.generatePackageInfoFromArchiveBuffer.mockReturnValue({
      packageInfo: { name: 'testpkg', version: '1.0.1' },
    } as any);

    mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
    await expect(getPackage('testpkg', '1.0.1')).rejects.toThrowError(
      new FleetError('Error fetching package')
    );
  });

  it('should try to retrieve from cache if there is a RegistryConnectionError and no bundled package', async () => {
    mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));
    mockGetResponseStreamWithSize.mockRejectedValueOnce(
      new RegistryConnectionError('Error connecting to EPR')
    );
    mockStreamToBuffer.mockResolvedValue(Buffer.from('testpkg'));
    mockVerifyPackageArchiveSignature.mockResolvedValue('verified');
    MockArchive.unpackBufferToAssetsMap.mockReturnValue({
      assetsMap: new Map([
        ['test-1.0.0/LICENSE.txt', Buffer.from('')],
        ['test-1.0.0/changelog.yml', Buffer.from('')],
        ['test-1.0.0/manifest.yml', Buffer.from('')],
        ['test-1.0.0/docs/README.md', Buffer.from('')],
      ]),
      paths: [],
      archiveIterator: {},
    } as any);
    MockArchive.getPackageInfo.mockReturnValue({ name: 'testpkg', version: '1.0.1' } as any);
    mockGetPackageAssetsMapCache.mockReturnValue({
      name: 'test',
    } as any);
    mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
    const result = await getPackage('testpkg', '1.0.1');
    expect(result).toEqual({
      archiveIterator: expect.any(Object),
      assetsMap: new Map([
        ['test-1.0.0/LICENSE.txt', Buffer.from('')],
        ['test-1.0.0/changelog.yml', Buffer.from('')],
        ['test-1.0.0/manifest.yml', Buffer.from('')],
        ['test-1.0.0/docs/README.md', Buffer.from('')],
      ]),
      packageInfo: {
        name: 'testpkg',
        version: '1.0.1',
      },
      paths: [],
      verificationResult: undefined,
    });
  });

  it('should falls back to bundled package if there is a RegistryConnectionError', async () => {
    mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));
    mockGetResponseStreamWithSize.mockRejectedValueOnce(
      new RegistryConnectionError('Error connecting to EPR')
    );
    mockStreamToBuffer.mockResolvedValue(Buffer.from('testpkg'));
    mockVerifyPackageArchiveSignature.mockResolvedValue('verified');
    MockArchive.unpackBufferToAssetsMap.mockReturnValue({
      assetsMap: new Map([
        ['test-1.0.0/LICENSE.txt', Buffer.from('')],
        ['test-1.0.0/changelog.yml', Buffer.from('')],
        ['test-1.0.0/manifest.yml', Buffer.from('')],
        ['test-1.0.0/docs/README.md', Buffer.from('')],
      ]),
      paths: [],
      archiveIterator: {},
    } as any);
    MockArchive.getPackageInfo.mockReturnValue({ name: 'testpkg', version: '1.0.1' } as any);
    mockGetPackageAssetsMapCache.mockReturnValue(new Map());
    mockGetBundledPackageByName.mockResolvedValue(bundledPackage);
    const result = await getPackage('testpkg', '1.0.1');
    expect(result).toEqual({
      archiveIterator: expect.any(Object),
      assetsMap: new Map([
        ['test-1.0.0/LICENSE.txt', Buffer.from('')],
        ['test-1.0.0/changelog.yml', Buffer.from('')],
        ['test-1.0.0/manifest.yml', Buffer.from('')],
        ['test-1.0.0/docs/README.md', Buffer.from('')],
      ]),
      packageInfo: {
        name: 'testpkg',
        version: '1.0.1',
      },
      paths: [],
      verificationResult: undefined,
    });
  });

  it('should throw if there is a RegistryConnectionError and could not find bundled package nor retrieve from cache ', async () => {
    mockFetchUrl.mockResolvedValue(JSON.stringify([registryPackage]));
    mockGetResponseStreamWithSize.mockRejectedValueOnce(
      new RegistryConnectionError('Error connecting to EPR')
    );
    mockStreamToBuffer.mockResolvedValue(Buffer.from('testpkg'));
    mockVerifyPackageArchiveSignature.mockResolvedValue('verified');
    MockArchive.unpackBufferToAssetsMap.mockReturnValue({
      assetsMap: new Map(),
      paths: [],
      archiveIterator: {},
    } as any);
    MockArchive.generatePackageInfoFromArchiveBuffer.mockReturnValue({
      packageInfo: undefined,
    } as any);

    mockGetBundledPackageByName.mockResolvedValue(undefined);
    await expect(getPackage('testpkg', '1.0.1')).rejects.toThrowError(
      new PackageNotFoundError('testpkg@1.0.1 not found')
    );
  });
});
