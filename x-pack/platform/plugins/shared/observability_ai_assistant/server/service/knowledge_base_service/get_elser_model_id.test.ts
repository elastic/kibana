/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { getElserModelId } from './get_elser_model_id';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../../types';

type Core = CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;

describe('getElserModelId', () => {
  const setup = ({ hasEnterpriseLicense = true } = {}) => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const license = licensingMock.createLicense({
      license: { type: hasEnterpriseLicense ? 'enterprise' : 'basic' },
    });
    const getELSER = jest.fn().mockResolvedValue({ model_id: '.elser_model_2_linux-x86_64' });
    const trainedModelsProvider = jest.fn().mockReturnValue({ getELSER });

    core.getStartServices.mockResolvedValue([
      coreStart,
      { licensing: { license$: of(license) } },
      {},
    ] as unknown as Awaited<ReturnType<typeof core.getStartServices>>);
    core.plugins.onSetup.mockResolvedValue({
      ml: { found: true, contract: { trainedModelsProvider } },
    });

    return { core, coreStart, trainedModelsProvider, getELSER, logger: loggerMock.create() };
  };

  it('passes an internal saved objects repository to the ML trained models provider', async () => {
    const { core, coreStart, trainedModelsProvider, logger } = setup();
    const repository = coreStart.savedObjects.createInternalRepository();

    const modelId = await getElserModelId({ core: core as unknown as Core, logger });

    expect(modelId).toBe('.elser_model_2_linux-x86_64');
    expect(repository).toBeDefined();
    expect(trainedModelsProvider).toHaveBeenCalledWith(expect.any(Object), repository);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns the default model id without calling ML below an enterprise license', async () => {
    const { core, trainedModelsProvider, logger } = setup({ hasEnterpriseLicense: false });

    const modelId = await getElserModelId({ core: core as unknown as Core, logger });

    expect(modelId).toBe('.elser_model_2');
    expect(trainedModelsProvider).not.toHaveBeenCalled();
  });

  it('falls back to the default model id when ML fails', async () => {
    const { core, getELSER, logger } = setup();
    getELSER.mockRejectedValue(new Error('boom'));

    const modelId = await getElserModelId({ core: core as unknown as Core, logger });

    expect(modelId).toBe('.elser_model_2');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
