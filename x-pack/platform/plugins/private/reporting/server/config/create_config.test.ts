/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, HttpServerInfo, Logger } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { createConfig } from './create_config';

describe('Reporting server createConfig', () => {
  let mockCoreSetup: CoreSetup;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockLogger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates random encryption key and default config using host, protocol, and port from server info', () => {
    const mockConfig = createMockConfigSchema({ encryptionKey: undefined, kibanaServer: {} });
    const result = createConfig(mockCoreSetup, mockConfig, mockLogger);

    expect(result.encryptionKey).toMatch(/\S{32,}/); // random 32 characters
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Generating a random key for xpack.reporting.encryptionKey. To prevent sessions from being invalidated on restart, please set xpack.reporting.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
    );
  });

  it('uses the user-provided encryption key', () => {
    const mockConfig = createMockConfigSchema({
      encryptionKey: 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
    });
    const result = createConfig(mockCoreSetup, mockConfig, mockLogger);
    expect(result.encryptionKey).toMatch('iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('it logs a warning if the user-provided encryption key is less than 32 characters', () => {
    const mockConfig = createMockConfigSchema({ encryptionKey: 'iiii', kibanaServer: {} });
    const result = createConfig(mockCoreSetup, mockConfig, mockLogger);

    expect(result.encryptionKey).toMatch('iiii');
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'The xpack.reporting.encryptionKey config is shorter than the recommended minimum length of 32 characters. For enhanced security, please update the encryption key to be at least 32 characters long.'
    );
  });

  it('uses the user-provided encryption key, reporting kibanaServer settings to override server info', () => {
    const mockConfig = createMockConfigSchema({
      encryptionKey: 'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
      kibanaServer: {
        hostname: 'reportingHost',
        port: 5677,
        protocol: 'httpsa',
      },
      statefulSettings: {
        enabled: true,
      },
    });
    const result = createConfig(mockCoreSetup, mockConfig, mockLogger);

    expect(result).toMatchInlineSnapshot(`
      Object {
        "capture": Object {
          "maxAttempts": 1,
        },
        "csv": Object {
          "scroll": Object {
            "duration": "30s",
            "size": 500,
          },
        },
        "encryptionKey": "iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii",
        "export_types": Object {
          "csv": Object {
            "enabled": true,
          },
          "pdf": Object {
            "enabled": true,
          },
          "png": Object {
            "enabled": true,
          },
        },
        "index": ".reporting",
        "kibanaServer": Object {
          "hostname": "reportingHost",
          "port": 5677,
          "protocol": "httpsa",
        },
        "queue": Object {
          "indexInterval": "week",
          "pollEnabled": true,
          "pollInterval": 3000,
          "timeout": 120000,
        },
        "statefulSettings": Object {
          "enabled": true,
        },
      }
    `);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it.each(['0', '0.0', '0.0.0', '0.0.0.0', '0000:0000:0000:0000:0000:0000:0000:0000', '::'])(
    `apply failover logic when hostname is given as "%s"`,
    (hostname) => {
      mockCoreSetup.http.getServerInfo = jest.fn(
        (): HttpServerInfo => ({
          name: 'cool server',
          hostname,
          port: 5601,
          protocol: 'http',
        })
      );

      const mockConfig = createMockConfigSchema({
        encryptionKey: 'aaaaaaaaaaaaabbbbbbbbbbbbaaaaaaaaa',
        kibanaServer: {
          hostname: undefined,
          port: undefined,
        },
      });
      expect(createConfig(mockCoreSetup, mockConfig, mockLogger)).toHaveProperty(
        'kibanaServer',
        expect.objectContaining({
          hostname: 'localhost',
          port: 5601,
          protocol: 'http',
        })
      );
    }
  );
});
