/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { ResourceTypes } from './resource_type';
import {
  getProductDocInferenceIdCandidates,
  isEisAvailable,
  isEisAvailableFromInferenceGet,
  planDefaultInferenceMigration,
  resolveDefaultInferenceId,
  resolveDefaultInferenceIdFromInferenceGet,
  resolveInstalledProductDocInferenceId,
} from './default_inference_id';

describe('resolveDefaultInferenceId', () => {
  it('prefers Jina when available alongside EIS ELSER and default ELSER', () => {
    expect(
      resolveDefaultInferenceId(
        new Set([
          defaultInferenceEndpoints.JINAv5,
          defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
          defaultInferenceEndpoints.ELSER,
        ])
      )
    ).toBe(defaultInferenceEndpoints.JINAv5);
  });

  it('prefers EIS ELSER when Jina is unavailable', () => {
    expect(
      resolveDefaultInferenceId(
        new Set([
          defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
          defaultInferenceEndpoints.ELSER,
        ])
      )
    ).toBe(defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID);
  });

  it('falls back to default ELSER when Jina and EIS ELSER are unavailable', () => {
    expect(resolveDefaultInferenceId(new Set([defaultInferenceEndpoints.ELSER]))).toBe(
      defaultInferenceEndpoints.ELSER
    );
  });

  it('falls back to default ELSER when no endpoints are available', () => {
    expect(resolveDefaultInferenceId(new Set())).toBe(defaultInferenceEndpoints.ELSER);
  });

  it('ignores resourceType today (same priority for all KB content)', () => {
    expect(
      resolveDefaultInferenceId(
        new Set([
          defaultInferenceEndpoints.JINAv5,
          defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
          defaultInferenceEndpoints.ELSER,
        ]),
        { resourceType: ResourceTypes.securityLabs }
      )
    ).toBe(defaultInferenceEndpoints.JINAv5);
  });
});

describe('isEisAvailable', () => {
  it('returns true when Jina is present', () => {
    expect(isEisAvailable(new Set([defaultInferenceEndpoints.JINAv5]))).toBe(true);
  });

  it('returns true when EIS ELSER is present', () => {
    expect(isEisAvailable(new Set([defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID]))).toBe(
      true
    );
  });

  it('returns false when only default ELSER is present', () => {
    expect(isEisAvailable(new Set([defaultInferenceEndpoints.ELSER]))).toBe(false);
  });

  it('returns false when no endpoints are present', () => {
    expect(isEisAvailable(new Set())).toBe(false);
  });
});

describe('isEisAvailableFromInferenceGet', () => {
  it('returns true when inference lookup includes an EIS endpoint', async () => {
    await expect(
      isEisAvailableFromInferenceGet(() =>
        Promise.resolve({
          endpoints: [{ inference_id: defaultInferenceEndpoints.JINAv5 }],
        })
      )
    ).resolves.toBe(true);
  });

  it('returns false when inference lookup has no EIS endpoints', async () => {
    await expect(
      isEisAvailableFromInferenceGet(() =>
        Promise.resolve({
          endpoints: [{ inference_id: defaultInferenceEndpoints.ELSER }],
        })
      )
    ).resolves.toBe(false);
  });

  it('returns false when inference lookup fails', async () => {
    await expect(
      isEisAvailableFromInferenceGet(() => Promise.reject(new Error('failed')))
    ).resolves.toBe(false);
  });
});

describe('getProductDocInferenceIdCandidates', () => {
  it('returns the default first without duplicates', () => {
    expect(getProductDocInferenceIdCandidates(defaultInferenceEndpoints.JINAv5)).toEqual([
      defaultInferenceEndpoints.JINAv5,
      defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
      defaultInferenceEndpoints.ELSER,
    ]);
  });
});

describe('resolveDefaultInferenceIdFromInferenceGet', () => {
  it('prefers Jina when inference lookup returns all supported endpoints', async () => {
    await expect(
      resolveDefaultInferenceIdFromInferenceGet(() =>
        Promise.resolve({
          endpoints: [
            { inference_id: defaultInferenceEndpoints.ELSER },
            { inference_id: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID },
            { inference_id: defaultInferenceEndpoints.JINAv5 },
          ],
        })
      )
    ).resolves.toBe(defaultInferenceEndpoints.JINAv5);
  });

  it('falls back to default ELSER when inference lookup fails', async () => {
    await expect(
      resolveDefaultInferenceIdFromInferenceGet(() => Promise.reject(new Error('failed')))
    ).resolves.toBe(defaultInferenceEndpoints.ELSER);
  });
});

describe('planDefaultInferenceMigration', () => {
  const installedFromPreviousVersion = [
    defaultInferenceEndpoints.ELSER,
    defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
  ];

  it('replaces installed ELSER with Jina and leaves custom models alone', () => {
    expect(
      planDefaultInferenceMigration({
        installedInferenceIds: installedFromPreviousVersion,
        currentDefaultInferenceId: defaultInferenceEndpoints.JINAv5,
      })
    ).toEqual({
      currentDefaultInferenceId: defaultInferenceEndpoints.JINAv5,
      supersededInferenceIds: [defaultInferenceEndpoints.ELSER],
      installCurrentDefault: true,
    });
  });

  it('removes ELSER when Jina documentation is already installed', () => {
    expect(
      planDefaultInferenceMigration({
        installedInferenceIds: [defaultInferenceEndpoints.JINAv5, defaultInferenceEndpoints.ELSER],
        currentDefaultInferenceId: defaultInferenceEndpoints.JINAv5,
      })
    ).toEqual({
      currentDefaultInferenceId: defaultInferenceEndpoints.JINAv5,
      supersededInferenceIds: [defaultInferenceEndpoints.ELSER],
      installCurrentDefault: false,
    });
  });

  it('treats ELSER and ELSER on EIS as the same installation', () => {
    expect(
      planDefaultInferenceMigration({
        installedInferenceIds: [defaultInferenceEndpoints.ELSER],
        currentDefaultInferenceId: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
      })
    ).toBeUndefined();
  });

  it('does not migrate when ELSER is still the default', () => {
    expect(
      planDefaultInferenceMigration({
        installedInferenceIds: installedFromPreviousVersion,
        currentDefaultInferenceId: defaultInferenceEndpoints.ELSER,
      })
    ).toBeUndefined();
  });

  it('uninstalls Jina when the default falls back to ELSER', () => {
    expect(
      planDefaultInferenceMigration({
        installedInferenceIds: [defaultInferenceEndpoints.JINAv5],
        currentDefaultInferenceId: defaultInferenceEndpoints.ELSER,
      })
    ).toEqual({
      currentDefaultInferenceId: defaultInferenceEndpoints.ELSER,
      supersededInferenceIds: [defaultInferenceEndpoints.JINAv5],
      installCurrentDefault: true,
    });
  });

  it('migrates when the request targets the new default', () => {
    expect(
      planDefaultInferenceMigration({
        installedInferenceIds: installedFromPreviousVersion,
        currentDefaultInferenceId: defaultInferenceEndpoints.JINAv5,
        requestedInferenceIds: [defaultInferenceEndpoints.JINAv5],
      })?.supersededInferenceIds
    ).toEqual([defaultInferenceEndpoints.ELSER]);
  });

  it('does not migrate a request that only updates a custom model', () => {
    expect(
      planDefaultInferenceMigration({
        installedInferenceIds: installedFromPreviousVersion,
        currentDefaultInferenceId: defaultInferenceEndpoints.JINAv5,
        requestedInferenceIds: [defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL],
      })
    ).toBeUndefined();
  });
});

describe('resolveInstalledProductDocInferenceId', () => {
  it('returns the first installed candidate inference ID', async () => {
    await expect(
      resolveInstalledProductDocInferenceId({
        getDefaultInferenceId: async () => defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
        isDocumentationAvailable: async (inferenceId) =>
          inferenceId === defaultInferenceEndpoints.ELSER,
      })
    ).resolves.toBe(defaultInferenceEndpoints.ELSER);
  });

  it('returns undefined when no candidate has installed documentation', async () => {
    await expect(
      resolveInstalledProductDocInferenceId({
        getDefaultInferenceId: async () => defaultInferenceEndpoints.JINAv5,
        isDocumentationAvailable: async () => false,
      })
    ).resolves.toBeUndefined();
  });
});
