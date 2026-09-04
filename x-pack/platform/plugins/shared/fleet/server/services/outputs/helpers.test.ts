/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { OTLP_MINIMUM_FLEET_SERVER_VERSION } from '../../../common/constants';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { isFleetServerVersionRequirementMet } from '../fleet_server/version_requirements';

import { checkOtlpOutputAllowed, findAgentlessPolicies, isOtlpOutputSupported } from './helpers';

jest.mock('../agent_policy');
jest.mock('../app_context');
jest.mock('../fleet_server/version_requirements');

const mockedIsFleetServerVersionRequirementMet =
  isFleetServerVersionRequirementMet as jest.MockedFunction<
    typeof isFleetServerVersionRequirementMet
  >;

describe('checkOtlpOutputAllowed', () => {
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const soClientMock = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsFleetServerVersionRequirementMet.mockResolvedValue(false);
  });

  it('returns { result: false } when the feature flag is off, without calling the version check', async () => {
    (appContextService.getExperimentalFeatures as jest.Mock).mockReturnValue({
      enableOtlpOutput: false,
    });

    const result = await checkOtlpOutputAllowed(esClientMock, soClientMock);

    expect(result).toEqual({ result: false, error: 'OTLP output type is not enabled' });
    expect(mockedIsFleetServerVersionRequirementMet).not.toHaveBeenCalled();
  });

  it('returns { result: false, error } when the feature flag is on but the version requirement is not met', async () => {
    (appContextService.getExperimentalFeatures as jest.Mock).mockReturnValue({
      enableOtlpOutput: true,
    });
    mockedIsFleetServerVersionRequirementMet.mockResolvedValue(false);

    const result = await checkOtlpOutputAllowed(esClientMock, soClientMock);

    expect(result.result).toBe(false);
    expect(result.error).toContain(OTLP_MINIMUM_FLEET_SERVER_VERSION);
    expect(result.error).toContain('or later');
  });

  it('returns { result: true } when both the feature flag and version requirement are met', async () => {
    (appContextService.getExperimentalFeatures as jest.Mock).mockReturnValue({
      enableOtlpOutput: true,
    });
    mockedIsFleetServerVersionRequirementMet.mockResolvedValue(true);

    const result = await checkOtlpOutputAllowed(esClientMock, soClientMock);

    expect(result).toEqual({ result: true });
    expect(result.error).toBeUndefined();
  });
});

describe('isOtlpOutputSupported', () => {
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const soClientMock = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsFleetServerVersionRequirementMet.mockResolvedValue(false);
  });

  it('delegates to isFleetServerVersionRequirementMet with the correct OTLP options', async () => {
    mockedIsFleetServerVersionRequirementMet.mockResolvedValue(true);

    const result = await isOtlpOutputSupported(esClientMock, soClientMock);

    expect(result).toBe(true);
    expect(mockedIsFleetServerVersionRequirementMet).toHaveBeenCalledWith({
      esClient: esClientMock,
      soClient: soClientMock,
      featureName: 'OTLP output',
      minimumFleetServerVersion: OTLP_MINIMUM_FLEET_SERVER_VERSION,
      settingKey: 'otlp_output_requirements_met',
    });
  });
});

describe('findAgentlessPolicies', () => {
  const mockInternalSoClient = {};
  const mockAgentlessPolicies = {
    items: [
      { id: '1', data_output_id: 'output-1' },
      { id: '2', data_output_id: null },
      { id: '3', data_output_id: 'output-2' },
    ],
  };

  beforeEach(() => {
    (appContextService.getInternalUserSOClientWithoutSpaceExtension as jest.Mock).mockReturnValue(
      mockInternalSoClient
    );
    (agentPolicyService.list as jest.Mock).mockResolvedValue(mockAgentlessPolicies);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return agentless policies without data_output_id when outputId is not provided', async () => {
    const result = await findAgentlessPolicies();
    expect(result).toEqual([{ id: '2', data_output_id: null }]);
  });

  it('should return agentless policies with the specified outputId or without data_output_id when outputId is provided', async () => {
    const result = await findAgentlessPolicies('output-1');
    expect(result).toEqual([
      { id: '1', data_output_id: 'output-1' },
      { id: '2', data_output_id: null },
    ]);
  });
});
