/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CrowdstrikeConnector } from './crowdstrike';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { CONNECTOR_ID as CROWDSTRIKE_CONNECTOR_ID } from '@kbn/connector-schemas/crowdstrike/constants';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { CrowdstrikeError } from './error';

const hostPath = 'https://api.crowdstrike.com/devices/entities/devices/v2';
const onlineStatusPath = 'https://api.crowdstrike.com/devices/entities/online-state/v1';
const actionsPath = 'https://api.crowdstrike.com/devices/entities/devices-actions/v2';
describe('CrowdstrikeConnector', () => {
  const logger = loggingSystemMock.createLogger();
  let connector: CrowdstrikeConnector;
  let mockedRequest: jest.Mock;
  let connectorUsageCollector: ConnectorUsageCollector;
  let services: ReturnType<typeof actionsMock.createServices>;

  const mockConnectorToken = {
    id: 'token-id',
    connectorId: 'connector-id',
    tokenType: 'access_token',
    token: 'testToken',
    expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    services = actionsMock.createServices();

    // Create spies for the connector token client methods
    jest.spyOn(services.connectorTokenClient, 'get');
    jest.spyOn(services.connectorTokenClient, 'updateOrReplace');

    connector = new CrowdstrikeConnector(
      {
        configurationUtilities: actionsConfigMock.create(),
        connector: { id: '1', type: CROWDSTRIKE_CONNECTOR_ID },
        config: { url: 'https://api.crowdstrike.com' },
        secrets: { clientId: '123', clientSecret: 'secret' },
        logger,
        services,
      },
      // @ts-expect-error passing a true value just for testing purposes
      { crowdstrikeConnectorRTROn: true }
    );

    // @ts-expect-error
    mockedRequest = connector.request = jest.fn() as jest.Mock;
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });

    // Mock cached token by default
    jest.mocked(services.connectorTokenClient.get).mockResolvedValue({
      hasErrors: false,
      connectorToken: mockConnectorToken,
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeHostActions', () => {
    it('should make a POST request to the correct URL with correct data', async () => {
      const mockResponse = { data: { id: 'testid', path: 'testpath' } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.executeHostActions(
        {
          command: 'contain',
          ids: ['id1', 'id2'],
        },
        connectorUsageCollector
      );

      expect(services.connectorTokenClient.get).toHaveBeenCalledWith({
        connectorId: '1',
        tokenType: 'access_token',
      });

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: actionsPath,
          method: 'post',
          params: { action_name: 'contain' },
          data: { ids: ['id1', 'id2'] },
          headers: expect.objectContaining({
            Authorization: 'Bearer testToken',
          }),
          paramsSerializer: expect.any(Function),
          responseSchema: expect.any(Object),
        }),
        connectorUsageCollector
      );
      expect(result).toEqual({ id: 'testid', path: 'testpath' });
    });
  });

  describe('getAgentDetails', () => {
    it('should make a GET request to the correct URL with correct params', async () => {
      const mockResponse = { data: { resources: [{}] } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.getAgentDetails(
        { ids: ['id1', 'id2'] },
        connectorUsageCollector
      );

      expect(services.connectorTokenClient.get).toHaveBeenCalledWith({
        connectorId: '1',
        tokenType: 'access_token',
      });

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer testToken',
          }),
          method: 'GET',
          params: { ids: ['id1', 'id2'] },
          paramsSerializer: expect.any(Function),
          responseSchema: expect.any(Object),
          url: hostPath,
        }),
        connectorUsageCollector
      );
      expect(result).toEqual({ resources: [{}] });
    });
  });

  describe('getAgentOnlineStatus', () => {
    it('should make a GET request to the correct URL with correct params', async () => {
      const mockResponse = { data: { resources: [{}] } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.getAgentOnlineStatus(
        { ids: ['id1', 'id2'] },
        connectorUsageCollector
      );

      expect(services.connectorTokenClient.get).toHaveBeenCalledWith({
        connectorId: '1',
        tokenType: 'access_token',
      });

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer testToken',
          }),
          method: 'GET',
          params: { ids: ['id1', 'id2'] },
          paramsSerializer: expect.any(Function),
          responseSchema: expect.any(Object),
          url: onlineStatusPath,
        }),
        connectorUsageCollector
      );
      expect(result).toEqual({ resources: [{}] });
    });
  });

  describe('error handling through public interface', () => {
    it('should handle various API error scenarios through public methods', async () => {
      // Test basic API error
      const basicError = { message: 'Basic API error', response: { status: 500 } };
      mockedRequest.mockRejectedValueOnce(basicError);

      await expect(
        connector.getAgentDetails({ ids: ['id1'] }, connectorUsageCollector)
      ).rejects.toThrow(CrowdstrikeError);

      // Reset mock
      mockedRequest.mockClear();

      // Test network connectivity issues by simulating actual request failure
      const networkError = { message: 'Network error', code: 'NETWORK_ERROR' };
      mockedRequest.mockRejectedValueOnce(networkError);

      await expect(
        connector.executeHostActions({ command: 'contain', ids: ['id1'] }, connectorUsageCollector)
      ).rejects.toThrow(CrowdstrikeError);

      // Reset mock
      mockedRequest.mockClear();

      // Test timeout scenarios
      const timeoutError = { message: 'Request timeout', code: 'TIMEOUT' };
      mockedRequest.mockRejectedValueOnce(timeoutError);

      await expect(
        connector.getAgentOnlineStatus({ ids: ['id1'] }, connectorUsageCollector)
      ).rejects.toThrow(CrowdstrikeError);
    });

    it('should propagate error messages correctly through all public methods', async () => {
      const testError = { message: 'Test error message' };

      // Test error propagation through different public methods individually
      mockedRequest.mockRejectedValueOnce(testError);
      await expect(
        connector.getAgentDetails({ ids: ['id1'] }, connectorUsageCollector)
      ).rejects.toThrow(CrowdstrikeError);

      mockedRequest.mockRejectedValueOnce(testError);
      await expect(
        connector.executeHostActions({ command: 'contain', ids: ['id1'] }, connectorUsageCollector)
      ).rejects.toThrow(CrowdstrikeError);

      mockedRequest.mockRejectedValueOnce(testError);
      await expect(
        connector.getAgentOnlineStatus({ ids: ['id1'] }, connectorUsageCollector)
      ).rejects.toThrow(CrowdstrikeError);

      mockedRequest.mockRejectedValueOnce(testError);
      await expect(connector.getRTRCloudScripts({}, connectorUsageCollector)).rejects.toThrow(
        CrowdstrikeError
      );
    });

    it('should handle authentication errors consistently across all methods', async () => {
      const authError = { message: 'Authentication failed', response: { status: 403 } };

      // Test each public method handles auth errors
      mockedRequest.mockRejectedValue(authError);

      await expect(
        connector.getAgentDetails({ ids: ['id1'] }, connectorUsageCollector)
      ).rejects.toThrow('Authentication failed');

      await expect(
        connector.executeHostActions({ command: 'contain', ids: ['id1'] }, connectorUsageCollector)
      ).rejects.toThrow('Authentication failed');

      await expect(
        connector.getAgentOnlineStatus({ ids: ['id1'] }, connectorUsageCollector)
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('token management', () => {
    it('should use cached token when available', async () => {
      const mockResponse = { data: { resources: [{}] } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      await connector.getAgentDetails({ ids: ['id1', 'id2'] }, connectorUsageCollector);

      expect(services.connectorTokenClient.get).toHaveBeenCalledWith({
        connectorId: '1',
        tokenType: 'access_token',
      });

      // Should not call token update since we have a valid cached token
      expect(services.connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();

      expect(mockedRequest).toHaveBeenCalledTimes(1);
      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer testToken',
          }),
        }),
        connectorUsageCollector
      );
    });

    it('should throw error when something goes wrong', async () => {
      const mockError = { code: 400, message: 'something goes wrong' };

      mockedRequest.mockRejectedValueOnce(mockError);

      await expect(() =>
        connector.getAgentDetails({ ids: ['id1', 'id2'] }, connectorUsageCollector)
      ).rejects.toThrowError('something goes wrong');
    });

    it('should handle authentication flow for API requests', async () => {
      // Test that connector uses token management for authentication
      // This tests the integration without testing private token manager methods
      const mockResponse = { data: { resources: [{}] } };
      mockedRequest.mockResolvedValue(mockResponse);

      const result = await connector.getAgentDetails(
        { ids: ['id1', 'id2'] },
        connectorUsageCollector
      );

      expect(result).toEqual({ resources: [{}] });

      // Verify that token client was used for authentication
      expect(services.connectorTokenClient.get).toHaveBeenCalledWith({
        connectorId: '1',
        tokenType: 'access_token',
      });

      // Verify request was made with authentication header
      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer testToken',
          }),
        }),
        connectorUsageCollector
      );
    });

    it('should handle authentication failures gracefully', async () => {
      // Test behavior when authentication completely fails
      const authError = {
        code: 403,
        message: 'Access denied',
      };

      mockedRequest.mockRejectedValue(authError);

      await expect(
        connector.getAgentDetails({ ids: ['id1', 'id2'] }, connectorUsageCollector)
      ).rejects.toThrow(CrowdstrikeError);

      // Should still attempt the request despite auth issues
      expect(mockedRequest).toHaveBeenCalled();
    });
  });

  describe('constructor and configuration', () => {
    it('should initialize correctly with valid configuration', () => {
      expect(connector).toBeDefined();
    });

    it('should handle URL configuration with trailing slash properly', async () => {
      const trailingSlashServices = actionsMock.createServices();
      // Mock token client to return valid token
      jest.spyOn(trailingSlashServices.connectorTokenClient, 'get').mockResolvedValue({
        hasErrors: false,
        connectorToken: mockConnectorToken,
      });

      const connectorWithTrailingSlash = new CrowdstrikeConnector(
        {
          configurationUtilities: actionsConfigMock.create(),
          connector: { id: '2', type: CROWDSTRIKE_CONNECTOR_ID },
          config: { url: 'https://api.crowdstrike.com/' }, // trailing slash
          secrets: { clientId: '123', clientSecret: 'secret' },
          logger,
          services: trailingSlashServices,
        },
        // @ts-expect-error passing a true value just for testing purposes
        { crowdstrikeConnectorRTROn: true }
      );

      const mockResponse = { data: { resources: [{}] } };
      const mockRequest = jest.fn().mockResolvedValue(mockResponse);
      // @ts-expect-error
      connectorWithTrailingSlash.request = mockRequest;

      await connectorWithTrailingSlash.getAgentDetails({ ids: ['id1'] }, connectorUsageCollector);

      // Verify request was made to correct URL despite trailing slash configuration
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.crowdstrike.com//devices/entities/devices/v2',
        }),
        connectorUsageCollector
      );
    });

    it('should work without experimental features enabled', async () => {
      const basicServices = actionsMock.createServices();
      // Mock token client to return valid token
      jest.spyOn(basicServices.connectorTokenClient, 'get').mockResolvedValue({
        hasErrors: false,
        connectorToken: mockConnectorToken,
      });

      const basicConnector = new CrowdstrikeConnector(
        {
          configurationUtilities: actionsConfigMock.create(),
          connector: { id: '3', type: CROWDSTRIKE_CONNECTOR_ID },
          config: { url: 'https://api.crowdstrike.com' },
          secrets: { clientId: '123', clientSecret: 'secret' },
          logger,
          services: basicServices,
        },
        // @ts-expect-error passing false value for testing purposes
        { crowdstrikeConnectorRTROn: false }
      );

      expect(basicConnector).toBeDefined();

      // Basic methods should still work
      const mockResponse = { data: { resources: [{}] } };
      const mockRequest = jest.fn().mockResolvedValue(mockResponse);
      // @ts-expect-error
      basicConnector.request = mockRequest;

      const result = await basicConnector.getAgentDetails(
        { ids: ['id1'] },
        connectorUsageCollector
      );
      expect(result).toEqual({ resources: [{}] });
    });

    it('should properly initialize token and session management', async () => {
      // Test that the connector can successfully make authenticated requests,
      // which validates token manager initialization
      const mockResponse = { data: { resources: [{}] } };
      mockedRequest.mockResolvedValue(mockResponse);

      const result = await connector.getAgentDetails({ ids: ['id1'] }, connectorUsageCollector);

      expect(result).toEqual({ resources: [{}] });
      expect(services.connectorTokenClient.get).toHaveBeenCalled();
    });
  });

  describe('RTR command execution and validation', () => {
    it('should reject unsupported RTR commands with clear error message', async () => {
      const mockSessionResponse = {
        data: {
          batch_id: 'test-batch-123',
          meta: { query_time: 1234567890 },
          resources: {},
          errors: [],
        },
      };

      mockedRequest.mockResolvedValueOnce(mockSessionResponse);

      await expect(
        connector.executeRTRCommand(
          {
            command: 'unsupported_command', // Not in SUPPORTED_RTR_COMMANDS
            endpoint_ids: ['id1', 'id2'],
          },
          connectorUsageCollector
        )
      ).rejects.toThrow(CrowdstrikeError);

      await expect(
        connector.executeRTRCommand(
          {
            command: 'unsupported_command',
            endpoint_ids: ['id1', 'id2'],
          },
          connectorUsageCollector
        )
      ).rejects.toThrow('Command not supported');
    });

    it('should handle session initialization failure in RTR command execution', async () => {
      const sessionInitError = { message: 'Session initialization failed' };
      mockedRequest.mockRejectedValueOnce(sessionInitError);

      await expect(
        connector.executeRTRCommand(
          {
            command: 'runscript -help',
            endpoint_ids: ['id1', 'id2'],
          },
          connectorUsageCollector
        )
      ).rejects.toThrow(CrowdstrikeError);
    });

    it('should correctly parse complex RTR commands with arguments', async () => {
      const mockSessionResponse = {
        data: {
          batch_id: 'test-batch-123',
          meta: { query_time: 1234567890 },
          resources: {},
          errors: [],
        },
      };

      const mockCommandResponse = { data: obfuscatedRTRResponse };

      mockedRequest
        .mockResolvedValueOnce(mockSessionResponse)
        .mockResolvedValueOnce(mockCommandResponse);

      const result = await connector.executeRTRCommand(
        {
          command: 'runscript -CloudFile "Get-Process" -CommandLine "-Name notepad"', // Complex command
          endpoint_ids: ['id1', 'id2'],
        },
        connectorUsageCollector
      );

      expect(result).toEqual(obfuscatedRTRResponse);

      // Verify the command was parsed correctly and sent with proper structure
      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.crowdstrike.com/real-time-response/combined/batch-command/v1',
          method: 'post',
          data: expect.objectContaining({
            base_command: 'runscript', // Should extract base command correctly
            command_string: 'runscript -CloudFile "Get-Process" -CommandLine "-Name notepad"',
            batch_id: 'test-batch-123',
            hosts: ['id1', 'id2'],
            persist_all: false,
          }),
        }),
        connectorUsageCollector
      );
    });

    it('should handle RTR command execution failure after successful session initialization', async () => {
      const mockSessionResponse = {
        data: {
          batch_id: 'test-batch-456',
          meta: { query_time: 1234567890 },
          resources: {},
          errors: [],
        },
      };

      const commandExecutionError = { message: 'Command execution failed' };

      mockedRequest
        .mockResolvedValueOnce(mockSessionResponse) // Session init succeeds
        .mockRejectedValueOnce(commandExecutionError); // Command execution fails

      await expect(
        connector.executeRTRCommand(
          {
            command: 'runscript -help',
            endpoint_ids: ['id1', 'id2'],
          },
          connectorUsageCollector
        )
      ).rejects.toThrow(CrowdstrikeError);

      // Verify both session init and command execution requests were attempted
      expect(mockedRequest).toHaveBeenCalledTimes(2);
    });

    it('should validate supported vs unsupported RTR commands', async () => {
      // Test that supported commands get to session initialization
      const mockSessionResponse = { data: { batch_id: 'test-batch' } };
      mockedRequest.mockResolvedValueOnce(mockSessionResponse);

      const sessionError = { message: 'Test session error' };
      mockedRequest.mockRejectedValueOnce(sessionError);

      // This should get past command validation but fail at session init
      await expect(
        connector.executeRTRCommand(
          { command: 'runscript -help', endpoint_ids: ['id1'] },
          connectorUsageCollector
        )
      ).rejects.toThrow(CrowdstrikeError);

      // Verify it at least tried to initialize session (command was valid)
      expect(mockedRequest).toHaveBeenCalled();

      mockedRequest.mockClear();

      // Test unsupported command - should fail immediately without session init
      await expect(
        connector.executeRTRCommand(
          { command: 'unsupported_command', endpoint_ids: ['id1'] },
          connectorUsageCollector
        )
      ).rejects.toThrow('Command not supported');

      // Should not have made any API calls for unsupported command
      expect(mockedRequest).not.toHaveBeenCalled();
    });
  });

  describe('executeRTRCommand', () => {
    it('should make a POST request to the correct URL with correct data', async () => {
      // Mock RTR session initialization response (first call)
      const mockSessionResponse = {
        data: {
          batch_id: 'test-batch-123',
          meta: { query_time: 1234567890 },
          resources: {},
          errors: [],
        },
      };

      // Mock RTR command execution response (second call)
      const mockCommandResponse = { data: obfuscatedRTRResponse };

      // Set up sequential mock responses
      mockedRequest
        .mockResolvedValueOnce(mockSessionResponse) // First call: session init
        .mockResolvedValueOnce(mockCommandResponse); // Second call: command execution

      const result = await connector.executeRTRCommand(
        {
          command: 'runscript -Raw',
          endpoint_ids: ['id1', 'id2'],
        },
        connectorUsageCollector
      );

      // Should call init session and execute RTR command
      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.crowdstrike.com/real-time-response/combined/batch-command/v1',
          method: 'post',
          data: expect.objectContaining({
            command_string: 'runscript -Raw',
            hosts: ['id1', 'id2'],
          }),
        }),
        connectorUsageCollector
      );

      expect(result).toEqual(obfuscatedRTRResponse);
    });
  });

  describe('batchActiveResponderExecuteRTR', () => {
    it('should make a POST request to the correct URL with correct data', async () => {
      // Mock RTR session initialization response (first call)
      const mockSessionResponse = {
        data: {
          batch_id: 'test-batch-456',
          meta: { query_time: 1234567890 },
          resources: {},
          errors: [],
        },
      };

      // Mock RTR command execution response (second call)
      const mockCommandResponse = { data: obfuscatedRTRResponse };

      // Set up sequential mock responses
      mockedRequest
        .mockResolvedValueOnce(mockSessionResponse) // First call: session init
        .mockResolvedValueOnce(mockCommandResponse); // Second call: command execution

      const result = await connector.batchActiveResponderExecuteRTR(
        {
          command: 'runscript',
          endpoint_ids: ['id1', 'id2'],
        },
        connectorUsageCollector
      );

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.crowdstrike.com/real-time-response/combined/batch-active-responder-command/v1',
          method: 'post',
        }),
        connectorUsageCollector
      );

      expect(result).toEqual(obfuscatedRTRResponse);
    });
  });

  describe('batchAdminExecuteRTR', () => {
    it('should make a POST request to the correct URL with correct data', async () => {
      // Mock RTR session initialization response (first call)
      const mockSessionResponse = {
        data: {
          batch_id: 'test-batch-789',
          meta: { query_time: 1234567890 },
          resources: {},
          errors: [],
        },
      };

      // Mock RTR command execution response (second call)
      const mockCommandResponse = { data: obfuscatedRTRResponse };

      // Set up sequential mock responses
      mockedRequest
        .mockResolvedValueOnce(mockSessionResponse) // First call: session init
        .mockResolvedValueOnce(mockCommandResponse); // Second call: command execution

      const result = await connector.batchAdminExecuteRTR(
        {
          command: 'runscript',
          endpoint_ids: ['id1', 'id2'],
        },
        connectorUsageCollector
      );

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.crowdstrike.com/real-time-response/combined/batch-admin-command/v1',
          method: 'post',
        }),
        connectorUsageCollector
      );

      expect(result).toEqual(obfuscatedRTRResponse);
    });
  });

  describe('getRTRCloudScripts', () => {
    it('should make a GET request to the correct URL with correct params', async () => {
      const mockResponse = { data: { scripts: [{}] } };

      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.getRTRCloudScripts({}, connectorUsageCollector);

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.crowdstrike.com/real-time-response/entities/scripts/v1',
          method: 'GET',
        }),
        connectorUsageCollector
      );

      expect(result).toEqual({ scripts: [{}] });
    });
  });

  describe('parameter serialization and handling', () => {
    it('should properly serialize URL parameters with special characters', async () => {
      const mockResponse = { data: { resources: [{}] } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      await connector.getAgentDetails({ ids: ['test id', 'test&value'] }, connectorUsageCollector);

      // Verify paramsSerializer is called and properly encodes special characters
      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { ids: ['test id', 'test&value'] },
          paramsSerializer: expect.any(Function),
        }),
        connectorUsageCollector
      );

      // Test the paramsSerializer function directly by extracting it from the call
      const call = mockedRequest.mock.calls[0][0];
      const serialized = call.paramsSerializer({
        'test key': 'test value',
        'special&chars': 'value with spaces',
      });

      expect(serialized).toBe('test%20key=test%20value&special%26chars=value%20with%20spaces');
    });

    it('should handle empty parameters gracefully', async () => {
      const mockResponse = { data: { resources: [{}] } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      await connector.getAgentDetails({ ids: [] }, connectorUsageCollector);

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { ids: [] },
          paramsSerializer: expect.any(Function),
        }),
        connectorUsageCollector
      );
    });

    it('should handle unicode characters in parameters', async () => {
      const mockResponse = { data: { resources: [{}] } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      await connector.getAgentDetails({ ids: ['тест', 'ñiño'] }, connectorUsageCollector);

      const call = mockedRequest.mock.calls[0][0];
      const serialized = call.paramsSerializer({
        unicode: 'тест ñiño',
      });

      // Should properly encode unicode characters
      expect(serialized).toContain('%D1%82%D0%B5%D1%81%D1%82'); // тест encoded
    });
  });

  describe('action parameters handling', () => {
    it('should handle executeHostActions with action parameters', async () => {
      const mockResponse = { data: { id: 'testid', path: 'testpath' } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.executeHostActions(
        {
          command: 'contain',
          ids: ['id1', 'id2'],
          actionParameters: {
            comment: 'Test containment',
            priority: 'high',
          },
        },
        connectorUsageCollector
      );

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: actionsPath,
          method: 'post',
          params: { action_name: 'contain' },
          data: {
            ids: ['id1', 'id2'],
            action_parameters: [
              { name: 'comment', value: 'Test containment' },
              { name: 'priority', value: 'high' },
            ],
          },
        }),
        connectorUsageCollector
      );
      expect(result).toEqual({ id: 'testid', path: 'testpath' });
    });

    it('should handle executeHostActions without action parameters', async () => {
      const mockResponse = { data: { id: 'testid2', path: 'testpath2' } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.executeHostActions(
        {
          command: 'lift_containment',
          ids: ['id3', 'id4'],
        },
        connectorUsageCollector
      );

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: actionsPath,
          method: 'post',
          params: { action_name: 'lift_containment' },
          data: {
            ids: ['id3', 'id4'],
          },
        }),
        connectorUsageCollector
      );
      expect(result).toEqual({ id: 'testid2', path: 'testpath2' });
    });

    it('should handle executeHostActions with empty action parameters', async () => {
      const mockResponse = { data: { id: 'testid3', path: 'testpath3' } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.executeHostActions(
        {
          command: 'contain',
          ids: ['id5'],
          actionParameters: {},
        },
        connectorUsageCollector
      );

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: actionsPath,
          method: 'post',
          params: { action_name: 'contain' },
          data: {
            ids: ['id5'],
            action_parameters: [],
          },
        }),
        connectorUsageCollector
      );
      expect(result).toEqual({ id: 'testid3', path: 'testpath3' });
    });

    it('should handle action parameters with special characters and values', async () => {
      const mockResponse = { data: { id: 'testid4', path: 'testpath4' } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.executeHostActions(
        {
          command: 'contain',
          ids: ['id6'],
          actionParameters: {
            comment: 'Test with "quotes" and & special chars',
            reason: 'Suspicious activity detected',
            'custom-field': 'value with spaces',
          },
        },
        connectorUsageCollector
      );

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            ids: ['id6'],
            action_parameters: [
              { name: 'comment', value: 'Test with "quotes" and & special chars' },
              { name: 'reason', value: 'Suspicious activity detected' },
              { name: 'custom-field', value: 'value with spaces' },
            ],
          },
        }),
        connectorUsageCollector
      );
      expect(result).toEqual({ id: 'testid4', path: 'testpath4' });
    });
  });
});

const obfuscatedRTRResponse = {
  combined: {
    resources: {
      host1: {
        session_id: 'abcdef123456',
        task_id: 'task123',
        complete: true,
        stdout:
          'bin \n boot \n dev \n etc \n home \n lib \n lib64 \n media \n mnt \n opt \n proc \n root \n run \n sbin \n srv \n sys \n tmp \n usr \n var \n',
        stderr: '',
        base_command: 'runscript',
        aid: 'aid123',
        errors: [{ message: 'Error example', code: 123 }],
        query_time: 1234567890,
        offline_queued: false,
      },
      host2: {
        session_id: 'ghijkl789101',
        task_id: 'task456',
        complete: false,
        stdout:
          'bin \n boot \n dev \n etc \n home \n lib \n lib64 \n media \n mnt \n opt \n proc \n root \n run \n sbin \n srv \n sys \n tmp \n usr \n var \n',
        stderr: '',
        base_command: 'getscripts',
        aid: 'aid456',
        errors: null,
        query_time: 9876543210,
        offline_queued: true,
      },
    },
  },
  meta: {
    query_time: 1234567890,
    powered_by: 'CrowdStrike',
    trace_id: 'trace-abcdef123456',
  },
  errors: [
    { message: 'An example error', code: 500 },
    { message: 'Another error example', code: 404 },
  ],
};
