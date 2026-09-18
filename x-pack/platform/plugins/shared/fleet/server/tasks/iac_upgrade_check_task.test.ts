/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../common/constants';
import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from '../services';
import { MAX_IAC_RENDER_INTEGRATIONS } from '../../common/types/rest_spec/iac_provisioner';
import {
  getCloudConnectorIntegrationSelections,
  getIacKeyOutcome,
  type IacIntegrationSelection,
} from '../services/cloud_connectors';
import { reportIacProvisionerUpgradeCheckCompleted } from '../services/telemetry/iac_provisioner_telemetry';
import { isIacProvisionerEnabled } from '../services/utils/iac_provisioner';

import { runIacUpgradeCheckTask } from './iac_upgrade_check_task';

jest.mock('../services/utils/iac_provisioner');
jest.mock('../services/telemetry/iac_provisioner_telemetry');
// getIacKeyOutcome is stubbed at the barrel level so this test drives the task's bookkeeping
// without mocking IaCP or the package registry.
jest.mock('../services/cloud_connectors', () => ({
  ...jest.requireActual('../services/cloud_connectors'),
  getCloudConnectorIntegrationSelections: jest.fn(),
  getIacKeyOutcome: jest.fn(),
}));

const mockedEnabled = jest.mocked(isIacProvisionerEnabled);
const mockedSelections = jest.mocked(getCloudConnectorIntegrationSelections);
const mockedGetIacKeyOutcome = jest.mocked(getIacKeyOutcome);

const makeConnector = (id: string, attributes: Record<string, unknown>) => ({
  id,
  attributes: { name: id, cloudProvider: 'aws', vars: {}, ...attributes },
});

const finderFor = (pages: unknown[][]) => ({
  async *find() {
    for (const page of pages) {
      yield { saved_objects: page };
    }
  },
  close: jest.fn(),
});

/** The lookup's answer for a connector whose integration set fits under the render cap. */
const stored = (integrations: IacIntegrationSelection[]) => ({ integrations, exceedsCap: false });

const mockSoClient = { createPointInTimeFinder: jest.fn(), update: jest.fn() } as any;
const signal = new AbortController().signal;

describe('iac_upgrade_check_task', () => {
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockSoClient.createPointInTimeFinder.mockReset();
    mockSoClient.update.mockReset();
    mockLogger = loggingSystemMock.createLogger();
    appContextService.start(createAppContextStartContractMock());
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(mockLogger);
    jest
      .spyOn(appContextService, 'getInternalUserSOClientWithoutSpaceExtension')
      .mockReturnValue(mockSoClient);
    mockedEnabled.mockResolvedValue(true);
    mockedSelections.mockResolvedValue(
      stored([
        { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
      ])
    );
  });

  it('does nothing when IaCP is disabled', async () => {
    mockedEnabled.mockResolvedValue(false);
    await runIacUpgradeCheckTask(signal);
    expect(mockSoClient.createPointInTimeFinder).not.toHaveBeenCalled();
    expect(reportIacProvisionerUpgradeCheckCompleted).not.toHaveBeenCalled();
  });

  it('marks upgrade_available for a no-key connector and up_to_date for a matching one', async () => {
    mockSoClient.createPointInTimeFinder.mockReturnValue(
      finderFor([[makeConnector('legacy', {}), makeConnector('current', { iac_key: 'sha256:a' })]])
    );
    // legacy: no stored key → no_key; current: keys match → matches
    mockedGetIacKeyOutcome.mockResolvedValueOnce('no_key').mockResolvedValueOnce('matches');
    mockSoClient.update.mockResolvedValue({});

    const counts = await runIacUpgradeCheckTask(signal);

    expect(mockSoClient.update).toHaveBeenCalledWith(
      CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      'legacy',
      expect.objectContaining({
        iac_upgrade_status: 'upgrade_available',
        iac_upgrade_checked_at: expect.any(String),
      })
    );
    expect(mockSoClient.update).toHaveBeenCalledWith(
      CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
      'current',
      expect.objectContaining({ iac_upgrade_status: 'up_to_date' })
    );
    expect(counts).toEqual({ upToDate: 1, upgradeAvailable: 1, skipped: 0 });
    expect(reportIacProvisionerUpgradeCheckCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        upToDate: 1,
        upgradeAvailable: 1,
        skipped: 0,
        durationMs: expect.any(Number),
      })
    );
    expect(mockedGetIacKeyOutcome).toHaveBeenCalledWith(
      mockSoClient,
      expect.objectContaining({ cloudProvider: 'aws' }),
      [{ name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] }],
      { flow: 'iac_upgrade_task', contextForLog: 'connector legacy' }
    );
    expect(mockedSelections).toHaveBeenCalledWith(mockSoClient, 'legacy', {
      maxPackages: MAX_IAC_RENDER_INTEGRATIONS,
    });
  });

  it('skips a connector whose integration set exceeds the render limit without comparing', async () => {
    mockSoClient.createPointInTimeFinder.mockReturnValue(finderFor([[makeConnector('huge', {})]]));
    mockedSelections.mockResolvedValue({ integrations: [], exceedsCap: true });

    const counts = await runIacUpgradeCheckTask(signal);

    expect(mockedGetIacKeyOutcome).not.toHaveBeenCalled();
    expect(mockSoClient.update).not.toHaveBeenCalled();
    expect(counts).toEqual({ upToDate: 0, upgradeAvailable: 0, skipped: 1 });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Connector huge skipped (fail open)')
    );
  });

  it('leaves status untouched when the current key cannot be determined (IaCP down)', async () => {
    mockSoClient.createPointInTimeFinder.mockReturnValue(finderFor([[makeConnector('c1', {})]]));
    mockedGetIacKeyOutcome.mockResolvedValue('key_unavailable');

    const counts = await runIacUpgradeCheckTask(signal);

    expect(mockSoClient.update).not.toHaveBeenCalled();
    expect(counts.skipped).toBe(1);
  });

  it('skips connectors with no package policies', async () => {
    mockSoClient.createPointInTimeFinder.mockReturnValue(
      finderFor([[makeConnector('unused', {})]])
    );
    mockedSelections.mockResolvedValue(stored([]));
    mockedGetIacKeyOutcome.mockResolvedValue('no_integrations');

    const counts = await runIacUpgradeCheckTask(signal);

    expect(mockedGetIacKeyOutcome).toHaveBeenCalledWith(
      mockSoClient,
      expect.anything(),
      [],
      expect.anything()
    );
    expect(counts.skipped).toBe(1);
  });

  it('counts a connector whose check throws as skipped and keeps going', async () => {
    mockSoClient.createPointInTimeFinder.mockReturnValue(
      finderFor([[makeConnector('bad', {}), makeConnector('good', { iac_key: 'sha256:a' })]])
    );
    mockedSelections
      .mockRejectedValueOnce(new Error('SO unavailable'))
      .mockResolvedValueOnce(
        stored([
          { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
        ])
      );
    mockedGetIacKeyOutcome.mockResolvedValue('matches');
    mockSoClient.update.mockResolvedValue({});

    const counts = await runIacUpgradeCheckTask(signal);

    expect(counts).toEqual({ upToDate: 1, upgradeAvailable: 0, skipped: 1 });
    expect(mockSoClient.update).toHaveBeenCalledTimes(1);
  });

  it('queries only AWS connectors with the projected fields and closes the finder', async () => {
    const finder = finderFor([[]]);
    mockSoClient.createPointInTimeFinder.mockReturnValue(finder);

    await runIacUpgradeCheckTask(signal);

    expect(mockSoClient.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
        filter: `${CLOUD_CONNECTOR_SAVED_OBJECT_TYPE}.attributes.cloudProvider: "aws"`,
        fields: ['cloudProvider', 'iac_key', 'iac_upgrade_status'],
      })
    );
    expect(finder.close).toHaveBeenCalled();
  });

  it('counts a connector as skipped and fires telemetry when soClient.update rejects', async () => {
    mockSoClient.createPointInTimeFinder.mockReturnValue(
      finderFor([
        [
          makeConnector('failing', { iac_key: 'sha256:a' }),
          makeConnector('ok', { iac_key: 'sha256:a' }),
        ],
      ])
    );
    mockedGetIacKeyOutcome.mockResolvedValue('matches');
    mockSoClient.update.mockRejectedValueOnce(new Error('ES write failed')).mockResolvedValue({});

    const counts = await runIacUpgradeCheckTask(signal);

    expect(counts).toEqual({ upToDate: 1, upgradeAvailable: 0, skipped: 1 });
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update connector failing')
    );
    expect(reportIacProvisionerUpgradeCheckCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ upToDate: 1, skipped: 1 })
    );
  });

  describe('status-transition logging', () => {
    it('logs an info message when the stored status differs from the new status', async () => {
      mockSoClient.createPointInTimeFinder.mockReturnValue(
        finderFor([
          [makeConnector('c1', { iac_key: 'sha256:a', iac_upgrade_status: 'upgrade_available' })],
        ])
      );
      mockedGetIacKeyOutcome.mockResolvedValue('matches');
      mockSoClient.update.mockResolvedValue({});

      await runIacUpgradeCheckTask(signal);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('status upgrade_available → up_to_date')
      );
    });

    it('does not log a status-transition message when the status is unchanged', async () => {
      mockSoClient.createPointInTimeFinder.mockReturnValue(
        finderFor([
          [makeConnector('c1', { iac_key: 'sha256:a', iac_upgrade_status: 'up_to_date' })],
        ])
      );
      mockedGetIacKeyOutcome.mockResolvedValue('matches');
      mockSoClient.update.mockResolvedValue({});

      await runIacUpgradeCheckTask(signal);

      const transitionLogs = (mockLogger.info as jest.Mock).mock.calls.filter(
        ([msg]: [string]) => typeof msg === 'string' && msg.includes('→')
      );
      expect(transitionLogs).toHaveLength(0);
    });
  });

  describe('abort handling', () => {
    it('rejects, closes the finder, and skips telemetry when aborted mid-run', async () => {
      const abortCtrl = new AbortController();
      const finder = finderFor([
        [makeConnector('bad', {}), makeConnector('good', { iac_key: 'sha256:a' })],
      ]);
      mockSoClient.createPointInTimeFinder.mockReturnValue(finder);
      mockedSelections.mockImplementationOnce(async () => {
        abortCtrl.abort();
        throw new Error('SO unavailable');
      });

      await expect(runIacUpgradeCheckTask(abortCtrl.signal)).rejects.toThrow(/aborted/i);
      expect(mockSoClient.update).not.toHaveBeenCalled();
      expect(finder.close).toHaveBeenCalled();
      expect(reportIacProvisionerUpgradeCheckCompleted).not.toHaveBeenCalled();
    });

    it('does not write a status the IaCP round trip resolved after the abort', async () => {
      const abortCtrl = new AbortController();
      mockSoClient.createPointInTimeFinder.mockReturnValue(
        finderFor([[makeConnector('slow', { iac_key: 'sha256:a' })]])
      );
      // The task is cancelled while the comparison is still pending; the answer lands afterwards.
      mockedGetIacKeyOutcome.mockImplementationOnce(async () => {
        abortCtrl.abort();
        return 'matches';
      });

      await expect(runIacUpgradeCheckTask(abortCtrl.signal)).rejects.toThrow(/aborted/i);
      expect(mockSoClient.update).not.toHaveBeenCalled();
      expect(reportIacProvisionerUpgradeCheckCompleted).not.toHaveBeenCalled();
    });
  });
});
