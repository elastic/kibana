/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import {
  KAFKA_OAUTH2_MINIMUM_FLEET_SERVER_VERSION,
  OTLP_MINIMUM_FLEET_SERVER_VERSION,
} from '../../../common/constants';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { checkFleetServerVersionsForSecretsStorage } from '../fleet_server';
import { isFleetServerVersionRequirementMet } from '../fleet_server/version_requirements';

import {
  checkKafkaOAuth2Allowed,
  checkOtlpOutputAllowed,
  findAgentlessPolicies,
  isOtlpOutputSupported,
} from './helpers';
import { isKafkaOAuth2AuthEnabled } from './kafka_auth_feature_flags';

jest.mock('../agent_policy');
jest.mock('../app_context');
jest.mock('../fleet_server');
jest.mock('../fleet_server/version_requirements');
jest.mock('./kafka_auth_feature_flags');

const mockedIsFleetServerVersionRequirementMet =
  isFleetServerVersionRequirementMet as jest.MockedFunction<
    typeof isFleetServerVersionRequirementMet
  >;

const mockedIsKafkaOAuth2AuthEnabled = isKafkaOAuth2AuthEnabled as jest.MockedFunction<
  typeof isKafkaOAuth2AuthEnabled
>;
const mockedCheckFleetServerVersions = checkFleetServerVersionsForSecretsStorage as jest.Mock;

describe('checkKafkaOAuth2Allowed', () => {
  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const soClientMock = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsKafkaOAuth2AuthEnabled.mockResolvedValue(true);
    mockedCheckFleetServerVersions.mockResolvedValue(true);
    (appContextService.getConfig as jest.Mock).mockReturnValue({
      internal: { fleetServerStandalone: false },
    });
  });

  it('returns { result: false } when the feature flag is off, without checking the versions', async () => {
    mockedIsKafkaOAuth2AuthEnabled.mockResolvedValue(false);

    const result = await checkKafkaOAuth2Allowed(esClientMock, soClientMock);

    expect(result).toEqual({
      result: false,
      error: 'OAuth2 authentication of Kafka outputs is not enabled',
    });
    expect(mockedCheckFleetServerVersions).not.toHaveBeenCalled();
  });

  it('returns { result: false, error } when a Fleet Server is below the minimum version', async () => {
    mockedCheckFleetServerVersions.mockResolvedValue(false);

    const result = await checkKafkaOAuth2Allowed(esClientMock, soClientMock);

    expect(result.result).toBe(false);
    expect(result.error).toContain(KAFKA_OAUTH2_MINIMUM_FLEET_SERVER_VERSION);
    expect(result.error).toContain('or later');
    expect(mockedCheckFleetServerVersions).toHaveBeenCalledWith(
      esClientMock,
      soClientMock,
      KAFKA_OAUTH2_MINIMUM_FLEET_SERVER_VERSION
    );
  });

  it('returns { result: true } when the flag is on and all Fleet Servers meet the version', async () => {
    const result = await checkKafkaOAuth2Allowed(esClientMock, soClientMock);

    expect(result).toEqual({ result: true });
  });

  it('does not check the versions when Fleet Server is standalone', async () => {
    (appContextService.getConfig as jest.Mock).mockReturnValue({
      internal: { fleetServerStandalone: true },
    });
    mockedCheckFleetServerVersions.mockResolvedValue(false);

    const result = await checkKafkaOAuth2Allowed(esClientMock, soClientMock);

    expect(result).toEqual({ result: true });
    expect(mockedCheckFleetServerVersions).not.toHaveBeenCalled();
  });
});

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
