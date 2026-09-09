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
import { CASE_TEMPLATE_SAVED_OBJECT, CASES_TELEMETRY_TASK_NAME } from '../../common/constants';
import type { ConfigType } from '../config';

jest.mock('./collect_telemetry_data');

const collectTelemetryDataMock = collectTelemetryData as jest.Mock;

/**
 * Registers the collector and runs the telemetry task once, so the assertions see the
 * arguments the task actually passes rather than a hand-built call.
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
    /**
     * Both halves are asserted from a single run on purpose. `featureEnabled` in the payload
     * is only truthful while the flag passed to the collection and the templates type in the
     * telemetry repository's allow-list agree, and these are read at two separate call sites.
     */
    it.each<[string, ConfigType['templates'] | undefined, boolean]>([
      ['is true when the flag is enabled', { enabled: true }, true],
      ['is false when the flag is disabled', { enabled: false }, false],
      ['falls back to false when the templates config is absent', undefined, false],
    ])(
      '%s, and the templates type is read to match',
      async (_description, templatesConfig, expected) => {
        const { allowedSavedObjectTypes } = await runTelemetryTask(templatesConfig);

        expect(collectTelemetryDataMock).toHaveBeenCalledWith(
          expect.objectContaining({ templatesEnabled: expected })
        );
        expect(allowedSavedObjectTypes.includes(CASE_TEMPLATE_SAVED_OBJECT)).toBe(expected);
      }
    );
  });
});
