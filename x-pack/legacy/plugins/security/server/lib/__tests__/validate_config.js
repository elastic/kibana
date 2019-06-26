/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { validateConfig } from '../validate_config';

describe('Validate config', function () {
  let config;
  const log = sinon.stub();
  const validKey = 'd624dce49dafa1401be7f3e1182b756a';

  beforeEach(() => {
    config = {
      get: sinon.stub(),
      getDefault: sinon.stub(),
      set: sinon.stub(),
    };
    log.resetHistory();
  });

  it('should log a warning and set xpack.security.encryptionKey if not set', function () {
    config.get.withArgs('server.ssl.key').returns('foo');
    config.get.withArgs('server.ssl.certificate').returns('bar');
    config.get.withArgs('xpack.security.secureCookies').returns(false);

    expect(() => validateConfig(config, log)).not.to.throwError();

    sinon.assert.calledWith(config.set, 'xpack.security.encryptionKey');
    sinon.assert.calledWith(config.set, 'xpack.security.secureCookies', true);
    sinon.assert.calledWithMatch(log, /Generating a random key/);
    sinon.assert.calledWithMatch(log, /please set xpack.security.encryptionKey/);
  });

  it('should throw error if xpack.security.encryptionKey is less than 32 characters', function () {
    config.get.withArgs('xpack.security.encryptionKey').returns('foo');

    const validateConfigFn = () => validateConfig(config);
    expect(validateConfigFn).to.throwException(/xpack.security.encryptionKey must be at least 32 characters/);
  });

  it('should log a warning if SSL is not configured', function () {
    config.get.withArgs('xpack.security.encryptionKey').returns(validKey);
    config.get.withArgs('xpack.security.secureCookies').returns(false);

    expect(() => validateConfig(config, log)).not.to.throwError();

    sinon.assert.neverCalledWith(config.set, 'xpack.security.encryptionKey');
    sinon.assert.neverCalledWith(config.set, 'xpack.security.secureCookies');
    sinon.assert.calledWithMatch(log, /Session cookies will be transmitted over insecure connections/);
  });

  it('should log a warning if SSL is not configured yet secure cookies are being used', function () {
    config.get.withArgs('xpack.security.encryptionKey').returns(validKey);
    config.get.withArgs('xpack.security.secureCookies').returns(true);

    expect(() => validateConfig(config, log)).not.to.throwError();

    sinon.assert.neverCalledWith(config.set, 'xpack.security.encryptionKey');
    sinon.assert.neverCalledWith(config.set, 'xpack.security.secureCookies');
    sinon.assert.calledWithMatch(log, /SSL must be configured outside of Kibana/);
  });

  it('should set xpack.security.secureCookies if SSL is configured', function () {
    config.get.withArgs('server.ssl.key').returns('foo');
    config.get.withArgs('server.ssl.certificate').returns('bar');
    config.get.withArgs('xpack.security.encryptionKey').returns(validKey);

    expect(() => validateConfig(config, log)).not.to.throwError();

    sinon.assert.neverCalledWith(config.set, 'xpack.security.encryptionKey');
    sinon.assert.calledWith(config.set, 'xpack.security.secureCookies', true);
    sinon.assert.notCalled(log);
  });
});
