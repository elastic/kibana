/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';
import { createCasesTelemetry } from '.';
import { collectTelemetryData } from './collect_telemetry_data';
import {
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  CASES_TELEMETRY_TASK_NAME,
} from '../../common/constants';
import type { ConfigType } from '../config';

jest.mock('./collect_telemetry_data');

const collectTelemetryDataMock = collectTelemetryData as jest.Mock;

/**
 * Registers the collector and runs the telemetry task once, so the assertions see the arguments
 * the task actually passes rather than a hand-built call.
 */
const runTelemetryTask = async (templatesConfig?: ConfigType['templates']) => {
  const core = coreMock.createSetup();
  const taskManager = taskManagerMock.createSetup();
  const logger = loggingSystemMock.createLogger();

  // Held as a typed local rather than read back off `getStartServices`, whose mock type is
  // widened to the real contract and so hides the repository factory's call history.
  const coreStart = coreMock.createStart();
  core.getStartServices.mockResolvedValue([coreStart, {}, {}]);

  createCasesTelemetry({
    core,
    taskManager,
    usageCollection: createUsageCollectionSetupMock(),
    logger,
    kibanaVersion: '8.0.0',
    templatesConfig,
  });

  const [[taskDefinitions]] = taskManager.registerTaskDefinitions.mock.calls;
  await taskDefinitions[CASES_TELEMETRY_TASK_NAME].createTaskRunner({} as RunContext).run();

  const [allowedSavedObjectTypes] = coreStart.savedObjects.createInternalRepository.mock.calls[0];

  return { allowedSavedObjectTypes: allowedSavedObjectTypes ?? [] };
};

describe('createCasesTelemetry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    collectTelemetryDataMock.mockResolvedValue({});
  });

  describe('templatesEnabled', () => {
    it.each<[string, ConfigType['templates'] | undefined, boolean]>([
      ['is true when the flag is enabled', { enabled: true }, true],
      ['is false when the flag is disabled', { enabled: false }, false],
      ['falls back to false when the templates config is absent', undefined, false],
    ])('%s', async (_description, templatesConfig, expected) => {
      await runTelemetryTask(templatesConfig);

      expect(collectTelemetryDataMock).toHaveBeenCalledWith(
        expect.objectContaining({ templatesEnabled: expected })
      );
    });

    /**
     * The gate is a product choice, not a technical one: the field-definition type is in the
     * telemetry repository whether or not the flag is on, so with it off the read would return
     * the definitions a deployment kept after disabling the feature.
     */
    it.each([true, false])(
      'reads field definitions regardless of the flag being %s',
      async (enabled) => {
        const { allowedSavedObjectTypes } = await runTelemetryTask({ enabled });

        expect(allowedSavedObjectTypes).toContain(CASE_FIELD_DEFINITION_SAVED_OBJECT);
      }
    );
  });
});
