/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import { ProxyAgent } from 'undici';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { fetchArtifactVersions, fetchSecurityLabsVersions } from './fetch_artifact_versions';
import type { ProductName } from '@kbn/product-doc-common';
import {
  DocumentationProduct,
  getArtifactName,
  getSecurityLabsArtifactName,
} from '@kbn/product-doc-common';

jest.mock('fs');

const fetchMock = jest.spyOn(global, 'fetch');

const DEFAULT_LAST_MODIFIED = '2024-10-09T15:01:03.137Z';

type BucketEntry = string | { key: string; lastModified: string };

const createResponse = ({
  artifactNames,
  truncated = false,
}: {
  artifactNames: BucketEntry[];
  truncated?: boolean;
}) => {
  return `
  <ListBucketResult xmlns="http://doc.s3.amazonaws.com/2006-03-01">
    <Name>kibana-ai-assistant-kb-artifacts</Name>
    <Prefix/>
    <Marker/>
    <IsTruncated>${truncated}</IsTruncated>
    ${artifactNames.map((entry) => {
      const { key, lastModified } =
        typeof entry === 'string' ? { key: entry, lastModified: DEFAULT_LAST_MODIFIED } : entry;
      return `
       <Contents>
        <Key>${key}</Key>
        <Generation>1728486063097626</Generation>
        <MetaGeneration>1</MetaGeneration>
        <LastModified>${lastModified}</LastModified>
        <ETag>"e0584955969eccf2a16b8829f768cb1f"</ETag>
        <Size>36781438</Size>
      </Contents>`;
    })}
  </ListBucketResult>
  `;
};

const artifactRepositoryUrl = 'https://lost.com';
const localArtifactRepositoryUrl = 'file://usr/local/local_artifacts';
const inferenceId = defaultInferenceEndpoints.ELSER;

// Expected result; unless given, the published products are the ones with versions
const expectVersions = (
  versions: Partial<Record<ProductName | 'openapi', string[]>>,
  publishedProducts: Array<ProductName | 'openapi'> = (
    Object.keys(versions) as Array<ProductName | 'openapi'>
  ).filter((product) => versions[product]?.length)
) => {
  const response = {} as Record<ProductName | 'openapi', string[]>;
  Object.values(DocumentationProduct).forEach((productName) => {
    response[productName] = [];
  });
  response.openapi = [];
  return {
    versions: { ...response, ...versions },
    publishedProducts: expect.arrayContaining(publishedProducts),
  };
};

describe('fetchArtifactVersions', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    jest.clearAllMocks();
  });

  const mockResponse = (responseText: string) => {
    const response = {
      text: () => Promise.resolve(responseText),
    };
    fetchMock.mockResolvedValue(response as unknown as Response);
  };

  const mockFileResponse = (responseText: string) => {
    const mockData = Buffer.from(responseText);
    (fs.readFile as unknown as jest.Mock).mockImplementation((path, callback) => {
      callback(null, mockData);
    });
  };

  it('calls fetch with the right parameters', async () => {
    mockResponse(createResponse({ artifactNames: [] }));

    await fetchArtifactVersions({ artifactRepositoryUrl, inferenceId });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${artifactRepositoryUrl}?max-keys=1000`, {});
  });

  it('passes a proxy dispatcher to fetch when a proxy URL is configured', async () => {
    mockResponse(createResponse({ artifactNames: [] }));
    const artifactRepositoryProxyUrl = 'http://proxy.example.com:3128';

    await fetchArtifactVersions({ artifactRepositoryUrl, artifactRepositoryProxyUrl, inferenceId });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchOptions = fetchMock.mock.calls[0][1] as { dispatcher?: ProxyAgent };
    expect(fetchOptions.dispatcher).toBeInstanceOf(ProxyAgent);
  });

  it('parses the local file', async () => {
    const artifactNames = [
      getArtifactName({ productName: 'kibana', productVersion: '8.16' }),
      getArtifactName({ productName: 'elasticsearch', productVersion: '8.16' }),
    ];
    mockFileResponse(createResponse({ artifactNames }));

    const result = await fetchArtifactVersions({
      artifactRepositoryUrl: localArtifactRepositoryUrl,
      inferenceId,
    });

    expect(fs.readFile as unknown as jest.Mock).toHaveBeenCalledWith(
      '/local/local_artifacts/index.xml',
      expect.any(Function)
    );

    expect(result).toEqual(expectVersions({ elasticsearch: ['8.16'], kibana: ['8.16'] }));
  });

  it('supports win32 env', async () => {
    const artifactNames = [
      getArtifactName({ productName: 'kibana', productVersion: '8.16' }),
      getArtifactName({ productName: 'elasticsearch', productVersion: '8.16' }),
    ];
    mockFileResponse(createResponse({ artifactNames }));

    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    });

    await fetchArtifactVersions({
      artifactRepositoryUrl: 'file:///C:/path/local_artifacts',
      inferenceId,
    });

    expect(fs.readFile as unknown as jest.Mock).toHaveBeenCalledWith(
      'C:/path/local_artifacts/index.xml',
      expect.any(Function)
    );

    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  it('returns the list of versions from the repository', async () => {
    const artifactNames = [
      getArtifactName({ productName: 'kibana', productVersion: '8.16' }),
      getArtifactName({ productName: 'elasticsearch', productVersion: '8.16' }),
    ];
    mockResponse(createResponse({ artifactNames }));

    const versions = await fetchArtifactVersions({ artifactRepositoryUrl, inferenceId });

    expect(versions).toEqual(
      expectVersions({
        kibana: ['8.16'],
        elasticsearch: ['8.16'],
        openapi: [],
      })
    );
  });

  it('retrieve all versions for each product', async () => {
    const artifactNames = [
      getArtifactName({ productName: 'kibana', productVersion: '8.15' }),
      getArtifactName({ productName: 'kibana', productVersion: '8.16' }),
      getArtifactName({ productName: 'kibana', productVersion: '8.17' }),
      getArtifactName({ productName: 'elasticsearch', productVersion: '8.16' }),
      getArtifactName({ productName: 'elasticsearch', productVersion: '9.0' }),
    ];
    mockResponse(createResponse({ artifactNames }));

    const versions = await fetchArtifactVersions({ artifactRepositoryUrl, inferenceId });

    expect(versions).toEqual(
      expectVersions({
        kibana: ['8.15', '8.16', '8.17'],
        elasticsearch: ['8.16', '9.0'],
        openapi: [],
      })
    );
  });

  it('throws an error if the response is truncated', async () => {
    mockResponse(createResponse({ artifactNames: [], truncated: true }));

    await expect(fetchArtifactVersions({ artifactRepositoryUrl, inferenceId })).rejects.toThrow(
      /bucket content is truncated/
    );
  });

  it('throws an error if the response is not valid xml', async () => {
    mockResponse('some plain text');

    await expect(fetchArtifactVersions({ artifactRepositoryUrl, inferenceId })).rejects.toThrow();
  });

  describe('`latest` artifacts', () => {
    const JINA = defaultInferenceEndpoints.JINAv5;
    const E5 = defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL;
    const ELSER_UPLOAD = '2026-09-28T18:04:16.544Z';
    const E5_UPLOAD = '2026-10-05T14:14:23.949Z';
    const JINA_UPLOAD = '2026-10-12T20:25:34.221Z';
    const REPUBLISH = '2026-11-20T08:00:00.000Z';

    const latestEntry = (
      productName: ProductName | 'openapi',
      variant: string | undefined,
      lastModified: string
    ): BucketEntry => ({
      key: getArtifactName({
        productName: productName as ProductName,
        productVersion: 'latest',
        inferenceId: variant,
      }),
      lastModified,
    });

    const mixedListing = () =>
      createResponse({
        artifactNames: [
          getArtifactName({ productName: 'kibana', productVersion: '9.6' }),
          getArtifactName({ productName: 'kibana', productVersion: '9.6', inferenceId: JINA }),
          latestEntry('kibana', undefined, ELSER_UPLOAD),
          latestEntry('kibana', E5, E5_UPLOAD),
          latestEntry('kibana', JINA, JINA_UPLOAD),
          latestEntry('elasticsearch', undefined, ELSER_UPLOAD),
          latestEntry('elasticsearch', JINA, JINA_UPLOAD),
          latestEntry('openapi', undefined, ELSER_UPLOAD),
          latestEntry('openapi', JINA, JINA_UPLOAD),
        ],
      });

    it('only versions `latest` from the artifact published for the inference ID', async () => {
      mockResponse(mixedListing());

      await expect(
        fetchArtifactVersions({ artifactRepositoryUrl, inferenceId: JINA })
      ).resolves.toEqual(
        expectVersions({
          kibana: ['9.6', '9.6', `latest-${JINA_UPLOAD}`],
          elasticsearch: [`latest-${JINA_UPLOAD}`],
          openapi: [`latest-${JINA_UPLOAD}`],
        })
      );
    });

    it('maps implied default ELSER inference IDs to the unsuffixed `latest` artifact', async () => {
      mockResponse(mixedListing());

      for (const elserId of [
        defaultInferenceEndpoints.ELSER,
        defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
      ]) {
        await expect(
          fetchArtifactVersions({ artifactRepositoryUrl, inferenceId: elserId })
        ).resolves.toEqual(
          expectVersions({
            kibana: ['9.6', '9.6', `latest-${ELSER_UPLOAD}`],
            elasticsearch: [`latest-${ELSER_UPLOAD}`],
            openapi: [`latest-${ELSER_UPLOAD}`],
          })
        );
      }
    });

    it('returns no `latest` version when the inference ID has no `latest` artifact', async () => {
      mockResponse(mixedListing());

      await expect(
        fetchArtifactVersions({ artifactRepositoryUrl, inferenceId: E5 })
      ).resolves.toEqual(
        expectVersions(
          { kibana: ['9.6', '9.6', `latest-${E5_UPLOAD}`], elasticsearch: [], openapi: [] },
          ['kibana', 'elasticsearch', 'openapi']
        )
      );
    });

    it('keeps the `latest` version of an inference ID when another variant is republished', async () => {
      mockResponse(
        createResponse({
          artifactNames: [
            latestEntry('kibana', undefined, REPUBLISH),
            latestEntry('kibana', JINA, JINA_UPLOAD),
            latestEntry('openapi', undefined, REPUBLISH),
            latestEntry('openapi', JINA, JINA_UPLOAD),
          ],
        })
      );

      await expect(
        fetchArtifactVersions({ artifactRepositoryUrl, inferenceId: JINA })
      ).resolves.toEqual(
        expectVersions({ kibana: [`latest-${JINA_UPLOAD}`], openapi: [`latest-${JINA_UPLOAD}`] })
      );
    });

    it('changes the `latest` version of an inference ID when its own artifact is republished', async () => {
      mockResponse(
        createResponse({
          artifactNames: [
            latestEntry('kibana', undefined, ELSER_UPLOAD),
            latestEntry('kibana', JINA, REPUBLISH),
            latestEntry('openapi', undefined, ELSER_UPLOAD),
            latestEntry('openapi', JINA, REPUBLISH),
          ],
        })
      );

      await expect(
        fetchArtifactVersions({ artifactRepositoryUrl, inferenceId: JINA })
      ).resolves.toEqual(
        expectVersions({ kibana: [`latest-${REPUBLISH}`], openapi: [`latest-${REPUBLISH}`] })
      );
      await expect(fetchArtifactVersions({ artifactRepositoryUrl, inferenceId })).resolves.toEqual(
        expectVersions({ kibana: [`latest-${ELSER_UPLOAD}`], openapi: [`latest-${ELSER_UPLOAD}`] })
      );
    });

    it('applies the same rule to a local artifact index', async () => {
      mockFileResponse(mixedListing());

      await expect(
        fetchArtifactVersions({
          artifactRepositoryUrl: localArtifactRepositoryUrl,
          inferenceId: JINA,
        })
      ).resolves.toEqual(
        expectVersions({
          kibana: ['9.6', '9.6', `latest-${JINA_UPLOAD}`],
          elasticsearch: [`latest-${JINA_UPLOAD}`],
          openapi: [`latest-${JINA_UPLOAD}`],
        })
      );
    });
  });
});

describe('fetchSecurityLabsVersions', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    jest.clearAllMocks();
  });

  const mockResponse = (responseText: string) => {
    const response = {
      text: () => Promise.resolve(responseText),
    };
    fetchMock.mockResolvedValue(response as unknown as Response);
  };

  const ELSER_VERSION = '2026.07.15-231202';
  const JINA_VERSION = '2026.07.15-231254';
  const OLDER_ELSER_VERSION = '2026.07.10-120000';

  it('returns only versions with an exact artifact for the requested inference ID', async () => {
    mockResponse(
      createResponse({
        artifactNames: [
          getSecurityLabsArtifactName({ version: ELSER_VERSION }),
          getSecurityLabsArtifactName({
            version: JINA_VERSION,
            inferenceId: defaultInferenceEndpoints.JINAv5,
          }),
        ],
      })
    );

    await expect(
      fetchSecurityLabsVersions({
        artifactRepositoryUrl,
        inferenceId: defaultInferenceEndpoints.ELSER,
      })
    ).resolves.toEqual([ELSER_VERSION]);

    await expect(
      fetchSecurityLabsVersions({
        artifactRepositoryUrl,
        inferenceId: defaultInferenceEndpoints.JINAv5,
      })
    ).resolves.toEqual([JINA_VERSION]);
  });

  it('returns all unsuffixed ELSER versions when multiple exist', async () => {
    mockResponse(
      createResponse({
        artifactNames: [
          getSecurityLabsArtifactName({ version: OLDER_ELSER_VERSION }),
          getSecurityLabsArtifactName({ version: ELSER_VERSION }),
          getSecurityLabsArtifactName({
            version: JINA_VERSION,
            inferenceId: defaultInferenceEndpoints.JINAv5,
          }),
        ],
      })
    );

    await expect(
      fetchSecurityLabsVersions({
        artifactRepositoryUrl,
        inferenceId: defaultInferenceEndpoints.ELSER,
      })
    ).resolves.toEqual([OLDER_ELSER_VERSION, ELSER_VERSION]);
  });

  it('returns an empty list when no artifact matches the inference ID', async () => {
    mockResponse(
      createResponse({
        artifactNames: [
          getSecurityLabsArtifactName({
            version: JINA_VERSION,
            inferenceId: defaultInferenceEndpoints.JINAv5,
          }),
        ],
      })
    );

    await expect(
      fetchSecurityLabsVersions({
        artifactRepositoryUrl,
        inferenceId: defaultInferenceEndpoints.ELSER,
      })
    ).resolves.toEqual([]);
  });
});
