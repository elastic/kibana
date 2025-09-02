/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import axios from 'axios';
import { ArtifactNotFoundError, ManifestNotFoundError } from './artifact.errors';
import { generateKeyPairSync, createSign } from 'crypto';
import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';
import AdmZip from 'adm-zip';
import { ArtifactService } from './artifact';

jest.mock('axios');

describe('ArtifactService', () => {
  const url = 'http://localhost:3000';
  const requestTimeout = 10_000;
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const logger = loggingSystemMock.createLogger();
  const defaultClusterInfo: InfoResponse = {
    name: 'elasticsearch',
    cluster_name: 'elasticsearch',
    cluster_uuid: 'fiNVFADnQsepL3HXYMs-qg',
    version: {
      number: '9.2.0-SNAPSHOT',
      build_flavor: 'default',
      build_type: 'tar',
      build_hash: '560464e544b7e37e581874f44c19c7eac930f901',
      build_date: '2025-07-08T02:09:11.988781060Z',
      build_snapshot: true,
      lucene_version: '10.2.2',
      minimum_wire_compatibility_version: '8.19.0',
      minimum_index_compatibility_version: '8.0.0',
    },
    tagline: 'You Know, for Search',
  };
  const artifactName = 'telemetry-buffer-and-batch-sizes-v1';

  let privKey: string;
  let pubKey: string;

  beforeAll(() => {
    ({ publicKey: pubKey, privateKey: privKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    }));
  });

  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  it('should fail when manifest is not found', async () => {
    const artifactService = new ArtifactService(logger, createClusterInfoWithVersion(), {
      url,
      pubKey,
      requestTimeout,
    });

    mockedAxios.get.mockImplementationOnce(() => Promise.resolve({ status: 404 }));

    await expect(artifactService.getArtifact(artifactName)).rejects.toThrow(ManifestNotFoundError);
  });

  it('should construct manifest URL by removing -SNAPSHOT suffix from version number', async () => {
    const version = '9.2.0';
    const artifactService = new ArtifactService(
      logger,
      createClusterInfoWithVersion(`${version}-SNAPSHOT`),
      { url, pubKey, requestTimeout }
    );

    const zip = createManifestZipPackage(
      JSON.stringify({
        artifacts: {
          [artifactName]: {
            relative_url: '/downloads/artifacts/telemetry-buffer-and-batch-sizes-v1.json',
          },
        },
      })
    );

    setupMockResponses(zip.toBuffer());

    const result = await artifactService.getArtifact(artifactName);
    expect(result).toBeDefined();
    expect(mockedAxios.get.mock.calls[0][0]).toBe(
      `${url}/downloads/kibana/manifest/artifacts-${version}.zip`
    );
  });

  it('should use exact version number in manifest URL for non-snapshot versions', async () => {
    const version = '9.1.1';
    const artifactService = new ArtifactService(logger, createClusterInfoWithVersion(version), {
      url,
      pubKey,
      requestTimeout,
    });

    const zip = createManifestZipPackage(
      JSON.stringify({
        artifacts: {
          [artifactName]: {
            relative_url: '/downloads/artifacts/telemetry-buffer-and-batch-sizes-v1.json',
          },
        },
      })
    );

    setupMockResponses(zip.toBuffer());

    const result = await artifactService.getArtifact(artifactName);
    expect(result).toBeDefined();
    expect(mockedAxios.get.mock.calls[0][0]).toBe(
      `${url}/downloads/kibana/manifest/artifacts-${version}.zip`
    );
  });

  it('should throw an error when requesting an artifact that does not exist in the manifest', async () => {
    const invalidArtifactName = 'invalid-artifact-name';
    const artifactService = new ArtifactService(logger, createClusterInfoWithVersion(), {
      url,
      pubKey,
      requestTimeout,
    });

    const zip = createManifestZipPackage(
      JSON.stringify({
        artifacts: {
          [artifactName]: {
            relative_url: '/downloads/artifacts/telemetry-buffer-and-batch-sizes-v1.json',
          },
        },
      })
    );

    setupMockResponses(zip.toBuffer());

    await expect(artifactService.getArtifact(invalidArtifactName)).rejects.toThrow(
      ArtifactNotFoundError
    );
  });

  it('should retrieve and return artifact content when the artifact exists in the manifest', async () => {
    const content = 'artifact content';
    const artifactService = new ArtifactService(logger, createClusterInfoWithVersion(), {
      url,
      pubKey,
      requestTimeout,
    });

    const zip = createManifestZipPackage(
      JSON.stringify({
        artifacts: {
          [artifactName]: {
            relative_url: '/downloads/artifacts/telemetry-buffer-and-batch-sizes-v1.json',
          },
        },
      })
    );

    setupMockResponses(zip.toBuffer(), content);

    const result = await artifactService.getArtifact(artifactName);
    expect(result).toBeDefined();
    expect(result.data as string).toBe(content);
  });

  it('should cache manifest and use If-None-Match header for subsequent requests to avoid redundant downloads', async () => {
    const artifactService = new ArtifactService(logger, createClusterInfoWithVersion(), {
      url,
      pubKey,
      requestTimeout,
    });

    const zip = createManifestZipPackage(
      JSON.stringify({
        artifacts: {
          [artifactName]: {
            relative_url: '/downloads/artifacts/telemetry-buffer-and-batch-sizes-v1.json',
          },
        },
      })
    );

    const fakeEtag = '123';
    const axiosResponse = {
      status: 200,
      data: zip.toBuffer(),
      headers: { etag: fakeEtag },
    };

    // first request: download the .zip, second request: get the artifact, third request: check if the artifact is modified
    // and since the status is 304, it shouldn't download the artifact again.
    mockedAxios.get
      .mockImplementationOnce(() => Promise.resolve(axiosResponse))
      .mockImplementationOnce(() => Promise.resolve({ status: 200, data: {} }))
      .mockImplementationOnce(() => Promise.resolve({ status: 304 }));

    let manifest = await artifactService.getArtifact(artifactName);
    expect(manifest).not.toBeFalsy();
    expect(manifest.modified).toEqual(true);
    expect(mockedAxios.get.mock.calls.length).toBe(2);

    manifest = await artifactService.getArtifact(artifactName);
    expect(manifest).not.toBeFalsy();
    expect(manifest.modified).toEqual(false);
    expect(mockedAxios.get.mock.calls.length).toBe(3);

    const [_url, config] = mockedAxios.get.mock.calls[2];
    const headers = config?.headers ?? {};
    expect(headers).not.toBeFalsy();
    expect(headers['If-None-Match']).toEqual(fakeEtag);
  });

  it('should throw an error when manifest signature verification fails with mismatched public key', async () => {
    const { publicKey: altPubKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const version = '9.2.0';
    const artifactService = new ArtifactService(logger, createClusterInfoWithVersion(version), {
      url,
      pubKey: altPubKey,
      requestTimeout,
    });

    const zip = createManifestZipPackage(
      JSON.stringify({
        artifacts: {
          [artifactName]: {
            relative_url: '/downloads/artifacts/telemetry-buffer-and-batch-sizes-v1.json',
          },
        },
      })
    );

    setupMockResponses(zip.toBuffer());

    await expect(artifactService.getArtifact(artifactName)).rejects.toThrowError(
      'Invalid manifest signature'
    );
  });

  function createClusterInfoWithVersion(version: string = '9.2.0'): InfoResponse {
    return {
      ...defaultClusterInfo,
      version: {
        ...defaultClusterInfo.version,
        number: version,
      },
    };
  }

  function setupMockResponses(manifestZipContent: Buffer, artifactContent: string = '') {
    mockedAxios.get
      .mockImplementationOnce(() => {
        return Promise.resolve({
          status: 200,
          data: manifestZipContent,
          headers: {},
          config: { responseType: 'arraybuffer' },
        });
      })
      .mockImplementationOnce(() => {
        return Promise.resolve({
          status: 200,
          data: artifactContent,
          headers: {},
        });
      });
  }

  function signManifestContent(manifestJson: string): Buffer {
    const sign = createSign('RSA-SHA256');
    sign.update(manifestJson);
    sign.end();
    return sign.sign(privKey);
  }

  function createManifestZipPackage(manifestJson: string): AdmZip {
    const zip = new AdmZip();
    zip.addFile('manifest.json', Buffer.from(manifestJson));
    zip.addFile('manifest.sig', signManifestContent(manifestJson));
    return zip;
  }
});
