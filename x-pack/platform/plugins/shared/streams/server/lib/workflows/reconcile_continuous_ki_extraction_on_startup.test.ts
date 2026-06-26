/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED } from '@kbn/management-settings-ids';
import { reconcileContinuousKiExtractionOnStartup } from './reconcile_continuous_ki_extraction_on_startup';

describe('reconcileContinuousKiExtractionOnStartup', () => {
  const createDeps = ({
    enabled = false,
    ensureWorkflow = jest.fn().mockResolvedValue(undefined),
  }: {
    enabled?: boolean;
    ensureWorkflow?: jest.Mock;
  } = {}) => {
    const globalUiSettingsClient = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED) {
          return Promise.resolve(enabled);
        }
        return Promise.resolve(undefined);
      }),
    };

    const core = {
      savedObjects: {
        getUnsafeInternalClient: jest.fn().mockReturnValue({}),
      },
      uiSettings: {
        globalAsScopedToClient: jest.fn().mockReturnValue(globalUiSettingsClient),
      },
    } as unknown as CoreStart;

    const continuousKiExtractionWorkflowService = {
      ensureWorkflow,
    };

    const taskClient = {};

    const logger = {
      info: jest.fn(),
    } as unknown as Logger;

    return { core, continuousKiExtractionWorkflowService, taskClient, logger, ensureWorkflow };
  };

  it('does nothing when continuous extraction is disabled', async () => {
    const { core, continuousKiExtractionWorkflowService, taskClient, logger, ensureWorkflow } =
      createDeps();

    await reconcileContinuousKiExtractionOnStartup({
      core,
      continuousKiExtractionWorkflowService,
      taskClient,
      logger,
    });

    expect(ensureWorkflow).not.toHaveBeenCalled();
  });

  it('creates the extraction workflow when continuous extraction is enabled', async () => {
    const { core, continuousKiExtractionWorkflowService, taskClient, logger, ensureWorkflow } =
      createDeps({
        enabled: true,
      });

    await reconcileContinuousKiExtractionOnStartup({
      core,
      continuousKiExtractionWorkflowService,
      taskClient,
      logger,
    });

    expect(ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request: expect.objectContaining({
        headers: expect.objectContaining({ 'x-elastic-internal-origin': 'kibana' }),
      }),
      taskClient,
    });
    expect(logger.info).toHaveBeenCalledWith(
      'Reconciled continuous KI extraction workflow on startup'
    );
  });
});
