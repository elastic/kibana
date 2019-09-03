/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AuditLogger } from './audit_logger';
import { LICENSE_TYPE_STANDARD, LICENSE_TYPE_BASIC, LICENSE_TYPE_GOLD } from '../../common/constants';

const createMockConfig = (settings) => {
  const mockConfig = {
    get: jest.fn()
  };

  mockConfig.get.mockImplementation(key => {
    return settings[key];
  });

  return mockConfig;
};

const mockLicenseInfo = {
  isAvailable: () => true,
  feature: () => { return { registerLicenseCheckResultsGenerator: () => { return; } };},
  license: {
    isActive: () => true,
    isOneOf: () => true,
    getType: () => LICENSE_TYPE_STANDARD
  }
};

const mockConfig = createMockConfig({
  'xpack.security.enabled': true,
  'xpack.security.audit.enabled': true,
});

test(`calls server.log with 'info', audit', pluginId and eventType as tags`, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };

  const pluginId = 'foo';
  const auditLogger = new AuditLogger(mockServer, pluginId, mockConfig, mockLicenseInfo);

  const eventType = 'bar';
  auditLogger.log(eventType, '');
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(1);
  expect(mockServer.logWithMetadata).toHaveBeenCalledWith(['info', 'audit', pluginId, eventType], expect.anything(), expect.anything());
});

test(`calls server.log with message`, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };
  const auditLogger = new AuditLogger(mockServer, 'foo', mockConfig, mockLicenseInfo);

  const message = 'summary of what happened';
  auditLogger.log('bar', message);
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(1);
  expect(mockServer.logWithMetadata).toHaveBeenCalledWith(expect.anything(), message, expect.anything());
});

test(`calls server.log with metadata `, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };

  const auditLogger = new AuditLogger(mockServer, 'foo', mockConfig, mockLicenseInfo);

  const data = {
    foo: 'yup',
    baz: 'nah',
  };

  auditLogger.log('bar', 'summary of what happened', data);
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(1);
  expect(mockServer.logWithMetadata).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
    eventType: 'bar',
    foo: data.foo,
    baz: data.baz,
  });
});

test(`does not call server.log for license level < Standard`, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };
  const mockLicenseInfo = {
    isAvailable: () => true,
    feature: () => { return { registerLicenseCheckResultsGenerator: () => { return; } };},
    license: {
      isActive: () => true,
      isOneOf: () => false,
      getType: () => LICENSE_TYPE_BASIC
    }
  };

  const auditLogger = new AuditLogger(mockServer, 'foo', mockConfig, mockLicenseInfo);
  auditLogger.log('bar', 'what happened');
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(0);
});

test(`does not call server.log if security is not enabled`, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };

  const mockConfig = createMockConfig({
    'xpack.security.enabled': false,
    'xpack.security.audit.enabled': true,
  });

  const auditLogger = new AuditLogger(mockServer, 'foo', mockConfig, mockLicenseInfo);
  auditLogger.log('bar', 'what happened');
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(0);
});

test(`does not call server.log if security audit logging is not enabled`, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };

  const mockConfig = createMockConfig({
    'xpack.security.enabled': true
  });

  const auditLogger = new AuditLogger(mockServer, 'foo', mockConfig, mockLicenseInfo);
  auditLogger.log('bar', 'what happened');
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(0);
});

test(`calls server.log after basic -> gold upgrade`, () => {
  const mockServer = {
    logWithMetadata: jest.fn()
  };

  const endLicenseInfo = {
    isAvailable: () => true,
    license: {
      isActive: () => true,
      isOneOf: () => true,
      getType: () => LICENSE_TYPE_GOLD
    }
  };

  let licenseCheckResultsGenerator;

  const startLicenseInfo = {
    isAvailable: () => true,
    feature: () => { return { registerLicenseCheckResultsGenerator: (fn) => { licenseCheckResultsGenerator = fn; } };},
    license: {
      isActive: () => true,
      isOneOf: () => false,
      getType: () => LICENSE_TYPE_BASIC
    }
  };

  const auditLogger = new AuditLogger(mockServer, 'foo', mockConfig, startLicenseInfo);
  auditLogger.log('bar', 'what happened');
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(0);

  //change basic to gold
  licenseCheckResultsGenerator(endLicenseInfo);
  auditLogger.log('bar', 'what happened');
  expect(mockServer.logWithMetadata).toHaveBeenCalledTimes(1);

});
