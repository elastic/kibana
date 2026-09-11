/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ArtifactNotFoundError, ManifestNotFoundError } from './artifact.errors';
import { generateKeyPairSync, createSign } from 'crypto';
import { createServer } from 'http';
import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';
import AdmZip from 'adm-zip';
import { ArtifactService } from './artifact';

describe('ArtifactService', () => {
  const nativeFetch = global.fetch;
  const url = 'http://localhost:3000';
  const requestTimeout = 10_000;
  const mockedFetch = jest.spyOn(global, 'fetch');
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
    mockedFetch.mockReset();
  });

  it.each(['manifest', 'artifact'])('should time out while reading the %s body', async (stage) => {
    jest.useFakeTimers();
    try {
      const artifactService = new ArtifactService(logger, createClusterInfoWithVersion(), {
        url,
        pubKey,
        requestTimeout,
      });
      if (stage === 'artifact') {
        const zip = createManifestZipPackage(
          JSON.stringify({ artifacts: { [artifactName]: { relative_url: '/artifact.json' } } })
        );
        mockedFetch.mockResolvedValueOnce(new Response(new Uint8Array(zip.toBuffer())));
      }
      mockedFetch.mockImplementationOnce(async (_input, init) => {
        return new Response(
          new ReadableStream({
            start(controller) {
              init?.signal?.addEventListener('abort', () => {
                controller.error(new Error('Response body aborted'));
              });
            },
          })
        );
      });

      const result = expect(artifactService.getArtifact(artifactName)).rejects.toThrow(
        'Response body aborted'
      );
      await jest.advanceTimersByTimeAsync(requestTimeout);
      await result;
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('should fail when manifest is not found', async () => {
    const artifactService = new ArtifactService(logger, createClusterInfoWithVersion(), {
      url,
      pubKey,
      requestTimeout,
    });

    mockedFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

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
    expect(mockedFetch.mock.calls[0][0].toString()).toBe(
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
    expect(mockedFetch.mock.calls[0][0].toString()).toBe(
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
    const content = { indices_threshold: 100 };
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
    expect(result.data).toEqual(content);
  });

  it('should support credentials embedded in the CDN URL', async () => {
    mockedFetch.mockImplementation(nativeFetch);
    const content = { indices_threshold: 100 };
    const zip = createManifestZipPackage(
      JSON.stringify({
        artifacts: {
          [artifactName]: {
            relative_url: '/downloads/artifacts/telemetry-buffer-and-batch-sizes-v1.json',
          },
        },
      })
    );
    const authorizationHeaders: Array<string | undefined> = [];
    const server = createServer((request, response) => {
      authorizationHeaders.push(request.headers.authorization);
      response.writeHead(200);
      response.end(request.url?.includes('/manifest/') ? zip.toBuffer() : JSON.stringify(content));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected the test server to listen on a TCP port');
      }
      const artifactService = new ArtifactService(logger, createClusterInfoWithVersion(), {
        url: `http://user:pass@127.0.0.1:${address.port}`,
        pubKey,
        requestTimeout,
      });

      await expect(artifactService.getArtifact(artifactName)).resolves.toEqual({
        data: content,
        modified: true,
      });
      expect(authorizationHeaders).toEqual(['Basic dXNlcjpwYXNz', 'Basic dXNlcjpwYXNz']);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
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
    // first request: download the .zip, second request: get the artifact, third request: check if the artifact is modified
    // and since the status is 304, it shouldn't download the artifact again.
    mockedFetch
      .mockResolvedValueOnce(
        new Response(new Uint8Array(zip.toBuffer()), { status: 200, headers: { etag: fakeEtag } })
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));

    let manifest = await artifactService.getArtifact(artifactName);
    expect(manifest).not.toBeFalsy();
    expect(manifest.modified).toEqual(true);
    expect(mockedFetch.mock.calls.length).toBe(2);

    manifest = await artifactService.getArtifact(artifactName);
    expect(manifest).not.toBeFalsy();
    expect(manifest.modified).toEqual(false);
    expect(mockedFetch.mock.calls.length).toBe(3);

    const [_url, init] = mockedFetch.mock.calls[2];
    expect(new Headers(init?.headers).get('If-None-Match')).toEqual(fakeEtag);
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

    await expect(artifactService.getArtifact(artifactName)).rejects.toThrow(
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

  function setupMockResponses(manifestZipContent: Buffer, artifactContent: unknown = {}) {
    mockedFetch
      .mockResolvedValueOnce(new Response(new Uint8Array(manifestZipContent), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(artifactContent), { status: 200 }));
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
