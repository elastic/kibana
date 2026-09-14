/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy, Output } from '../../types';
import { createAppContextStartContractMock, createSavedObjectClientMock } from '../../mocks';
import { appContextService } from '../app_context';
import { outputService } from '../output';
import { getDownloadSourceForAgentPolicy } from '../../routes/agent/source_uri_utils';
import { getFleetServerHostsForAgentPolicy } from '../fleet_server_host';
import { bulkGetFleetProxies } from '../fleet_proxies';
import { OutputNotFoundError } from '../../errors';

import { fetchRelatedSavedObjects } from './related_saved_objects';

jest.mock('../output');
jest.mock('../../routes/agent/source_uri_utils');
jest.mock('../fleet_server_host');
jest.mock('../fleet_proxies');

const mockedOutputService = outputService as jest.Mocked<typeof outputService>;
const mockedGetDownloadSourceForAgentPolicy = getDownloadSourceForAgentPolicy as jest.Mock;
const mockedGetFleetServerHostsForAgentPolicy = getFleetServerHostsForAgentPolicy as jest.Mock;
const mockedBulkGetFleetProxies = bulkGetFleetProxies as jest.Mock;

const soClientMock = createSavedObjectClientMock();

const makeOutput = (id: string, type: string, extra: Partial<Output> = {}): Output =>
  ({ id, type, name: id, is_default: false, is_default_monitoring: false, ...extra } as Output);

const esOutput = makeOutput('default-es', 'elasticsearch');
const otlpOutput = makeOutput('otlp-out', 'otlp');

const basePolicy: AgentPolicy = {
  id: 'policy-1',
  name: 'Test Policy',
  namespace: 'default',
  is_managed: false,
  is_default: false,
  is_default_fleet_server: false,
  package_policies: [],
  revision: 1,
  updated_at: '',
  updated_by: '',
  schema_version: '1.0.0',
} as unknown as AgentPolicy;

describe('fetchRelatedSavedObjects', () => {
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    mockedGetDownloadSourceForAgentPolicy.mockResolvedValue({ proxy_id: undefined });
    mockedGetFleetServerHostsForAgentPolicy.mockResolvedValue(undefined);
    mockedBulkGetFleetProxies.mockResolvedValue([]);
    mockedOutputService.getDefaultDataOutputId.mockResolvedValue('default-es');
    mockedOutputService.getDefaultMonitoringOutputId.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('output ID resolution', () => {
    it('throws when no default data output is configured', async () => {
      mockedOutputService.getDefaultDataOutputId.mockResolvedValue(null);

      await expect(fetchRelatedSavedObjects(soClientMock, basePolicy)).rejects.toThrow(
        'Default output is not setup'
      );
      expect(mockedOutputService.bulkGet).not.toHaveBeenCalled();
    });

    // data output: explicit ID wins; defaultDataOutputId is the fallback
    it('uses defaultDataOutputId as data output when policy has no data_output_id', async () => {
      mockedOutputService.bulkGet.mockResolvedValue([esOutput]);

      const result = await fetchRelatedSavedObjects(soClientMock, basePolicy);

      expect(result.dataOutput.id).toBe('default-es');
    });

    it('uses policy data_output_id over defaultDataOutputId when set', async () => {
      const customEs = makeOutput('custom-es', 'elasticsearch');
      mockedOutputService.bulkGet.mockResolvedValue([customEs]);

      const result = await fetchRelatedSavedObjects(soClientMock, {
        ...basePolicy,
        data_output_id: 'custom-es',
      } as AgentPolicy);

      expect(result.dataOutput.id).toBe('custom-es');
    });

    // monitoring output: explicit ID > defaultMonitoringOutputId > dataOutputId
    it('uses explicit monitoring_output_id when set', async () => {
      const monitoringEs = makeOutput('monitoring-es', 'elasticsearch');
      mockedOutputService.bulkGet.mockResolvedValue([esOutput, monitoringEs]);

      const result = await fetchRelatedSavedObjects(soClientMock, {
        ...basePolicy,
        monitoring_output_id: 'monitoring-es',
      } as AgentPolicy);

      expect(result.monitoringOutput.id).toBe('monitoring-es');
    });

    it('falls back to defaultMonitoringOutputId when policy has no monitoring_output_id', async () => {
      const defaultMonitoringEs = makeOutput('default-monitoring-es', 'elasticsearch');
      mockedOutputService.getDefaultMonitoringOutputId.mockResolvedValue('default-monitoring-es');
      mockedOutputService.bulkGet.mockResolvedValue([esOutput, defaultMonitoringEs]);

      const result = await fetchRelatedSavedObjects(soClientMock, basePolicy);

      expect(result.monitoringOutput.id).toBe('default-monitoring-es');
    });

    it('falls back to dataOutputId when neither monitoring_output_id nor defaultMonitoringOutputId is set', async () => {
      mockedOutputService.bulkGet.mockResolvedValue([esOutput]);

      const result = await fetchRelatedSavedObjects(soClientMock, basePolicy);

      expect(result.monitoringOutput.id).toBe(result.dataOutput.id);
    });

    // OTLP override: when the resolved monitoring output is OTLP it is replaced with defaultDataOutputId,
    // because the agent has no OTLP monitoring implementation
    it('overrides an OTLP monitoring output with the default ES data output when already in the bulk fetch', async () => {
      mockedOutputService.bulkGet.mockResolvedValue([esOutput, otlpOutput]);

      const result = await fetchRelatedSavedObjects(soClientMock, {
        ...basePolicy,
        monitoring_output_id: 'otlp-out',
      } as AgentPolicy);

      expect(result.monitoringOutput.id).toBe('default-es');
      expect(result.monitoringOutput.type).toBe('elasticsearch');
    });

    it('fetches defaultDataOutputId individually when OTLP monitoring output is resolved but default ES was not bulk-fetched', async () => {
      mockedOutputService.bulkGet.mockResolvedValue([otlpOutput]);
      mockedOutputService.get.mockResolvedValue(esOutput);

      const result = await fetchRelatedSavedObjects(soClientMock, {
        ...basePolicy,
        data_output_id: 'otlp-out',
        monitoring_output_id: 'otlp-out',
      } as AgentPolicy);

      expect(mockedOutputService.get).toHaveBeenCalledWith('default-es');
      expect(result.monitoringOutput.type).toBe('elasticsearch');
    });

    it('throws OutputNotFoundError when the OTLP monitoring override cannot resolve a fallback output', async () => {
      // defaultDataOutputId is absent from bulk and outputService.get also fails
      mockedOutputService.getDefaultDataOutputId.mockResolvedValue('fallback-es');
      const policyEsOutput = makeOutput('policy-es', 'elasticsearch');
      mockedOutputService.bulkGet.mockResolvedValue([policyEsOutput, otlpOutput]);
      mockedOutputService.get.mockRejectedValue(new Error('not found'));

      await expect(
        fetchRelatedSavedObjects(soClientMock, {
          ...basePolicy,
          data_output_id: 'policy-es',
          monitoring_output_id: 'otlp-out',
        } as AgentPolicy)
      ).rejects.toThrow(OutputNotFoundError);
    });

    it('does not override monitoring output when it resolves to a non-OTLP type', async () => {
      const logstashOutput = makeOutput('logstash-out', 'logstash');
      mockedOutputService.bulkGet.mockResolvedValue([esOutput, logstashOutput]);

      const result = await fetchRelatedSavedObjects(soClientMock, {
        ...basePolicy,
        monitoring_output_id: 'logstash-out',
      } as AgentPolicy);

      expect(result.monitoringOutput.id).toBe('logstash-out');
      expect(mockedOutputService.get).not.toHaveBeenCalled();
    });
  });
});
