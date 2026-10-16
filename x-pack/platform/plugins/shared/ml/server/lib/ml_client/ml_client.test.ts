/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getMlClient } from './ml_client';
import type { MLSavedObjectService } from '../../saved_objects';
import type { MlAuditLogger } from './ml_audit_logger';
import type { MlLicense } from '../../../common/license/ml_license';
import type { estypes } from '@elastic/elasticsearch';
import type { ServerlessInfo } from '../../types';
import { MLJobNotFound } from './errors';

function setup(mlSavedObjectServiceOverrides: Partial<MLSavedObjectService> = {}) {
  const client = elasticsearchServiceMock.createScopedClusterClient();

  const mlSavedObjectService = {
    filterDatafeedIdsForSpace: jest.fn().mockResolvedValue([]),
    filterJobIdsForSpace: jest.fn().mockResolvedValue([]),
    ...mlSavedObjectServiceOverrides,
  } as unknown as MLSavedObjectService;

  const auditLogger = {
    wrapTask: jest.fn((task: () => unknown) => task()),
  } as unknown as MlAuditLogger;

  const mlLicense = {
    isSecurityEnabled: jest.fn().mockReturnValue(false),
  } as unknown as MlLicense;

  const serverless = {} as unknown as ServerlessInfo;

  const mlClient = getMlClient(client, mlSavedObjectService, auditLogger, mlLicense, serverless);

  return { client, mlClient, mlSavedObjectService };
}

describe('getMlClient previewDatafeed', () => {
  it('passes an inline preview payload as a plain object, not a JSON string', async () => {
    const { client, mlClient } = setup();
    client.asInternalUser.ml.previewDatafeed.mockResponse([] as never);

    const inlinePreviewRequest: estypes.MlPreviewDatafeedRequest = {
      start: 'now-15m',
      end: 'now',
      job_config: { job_id: 'preview-esql-job' } as estypes.MlJobConfig,
      datafeed_config: { datafeed_id: 'preview-esql-datafeed' } as estypes.MlDatafeedConfig,
    };

    await mlClient.previewDatafeed(inlinePreviewRequest, { maxRetries: 0 });

    expect(client.asInternalUser.ml.previewDatafeed).toHaveBeenCalledTimes(1);
    const sentRequest = client.asInternalUser.ml.previewDatafeed.mock.calls[0][0]!;
    expect(typeof sentRequest).not.toBe('string');
    expect(sentRequest).toEqual(inlinePreviewRequest);
  });
});

describe('getMlClient datafeedIdsCheck wrapper', () => {
  it('allows the call through when the datafeed is visible in the current space', async () => {
    const { client, mlClient, mlSavedObjectService } = setup({
      filterDatafeedIdsForSpace: jest.fn().mockResolvedValue(['visible-datafeed']),
    } as unknown as Partial<MLSavedObjectService>);
    client.asInternalUser.ml.startDatafeed.mockResponse({ started: true } as never);

    await mlClient.startDatafeed({ datafeed_id: 'visible-datafeed' });

    expect(mlSavedObjectService.filterDatafeedIdsForSpace).toHaveBeenCalledWith([
      'visible-datafeed',
    ]);
    expect(client.asInternalUser.ml.startDatafeed).toHaveBeenCalledTimes(1);
  });

  it('throws MLJobNotFound when the datafeed is not visible in the current space', async () => {
    const { mlClient } = setup({
      filterDatafeedIdsForSpace: jest.fn().mockResolvedValue([]),
    } as unknown as Partial<MLSavedObjectService>);

    await expect(mlClient.startDatafeed({ datafeed_id: 'hidden-datafeed' })).rejects.toThrow(
      MLJobNotFound
    );
  });
});

describe('getMlClient jobIdsCheck wrapper', () => {
  it('allows the call through when the job is visible in the current space', async () => {
    const { client, mlClient, mlSavedObjectService } = setup({
      filterJobIdsForSpace: jest.fn().mockResolvedValue(['visible-job']),
    } as unknown as Partial<MLSavedObjectService>);
    client.asInternalUser.ml.openJob.mockResponse({ opened: true } as never);

    await mlClient.openJob({ job_id: 'visible-job' });

    expect(mlSavedObjectService.filterJobIdsForSpace).toHaveBeenCalledWith('anomaly-detector', [
      'visible-job',
    ]);
    expect(client.asInternalUser.ml.openJob).toHaveBeenCalledTimes(1);
  });

  it('throws MLJobNotFound when the job is not visible in the current space', async () => {
    const { mlClient } = setup({
      filterJobIdsForSpace: jest.fn().mockResolvedValue([]),
    } as unknown as Partial<MLSavedObjectService>);

    await expect(mlClient.openJob({ job_id: 'hidden-job' })).rejects.toThrow(MLJobNotFound);
  });
});
