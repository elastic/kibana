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
import type { ServerlessInfo } from '../../types';

describe('getMlClient previewDatafeed', () => {
  it('passes an inline preview body as a plain object, not a JSON string', async () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    client.asInternalUser.ml.previewDatafeed.mockResponse([] as never);

    const mlSavedObjectService = {
      filterDatafeedIdsForSpace: jest.fn().mockResolvedValue([]),
    } as unknown as MLSavedObjectService;

    const auditLogger = {} as unknown as MlAuditLogger;

    const mlLicense = {
      isSecurityEnabled: jest.fn().mockReturnValue(false),
    } as unknown as MlLicense;

    const serverless = {} as unknown as ServerlessInfo;

    const mlClient = getMlClient(client, mlSavedObjectService, auditLogger, mlLicense, serverless);

    const inlinePreviewRequest = {
      start: 'now-15m',
      end: 'now',
      body: {
        job_config: { job_id: 'preview-esql-job' },
        datafeed_config: { datafeed_id: 'preview-esql-datafeed' },
      },
    };

    await mlClient.previewDatafeed(inlinePreviewRequest, { maxRetries: 0 });

    expect(client.asInternalUser.ml.previewDatafeed).toHaveBeenCalledTimes(1);
    const sentRequest = client.asInternalUser.ml.previewDatafeed.mock.calls[0][0]!;
    expect(typeof sentRequest.body).not.toBe('string');
    expect(sentRequest.body).toEqual(inlinePreviewRequest.body);
  });
});
