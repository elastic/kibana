/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { validateConfig } from '../validate_config';

// FAILING: https://github.com/elastic/kibana/issues/51373
describe.skip('Reporting: Validate config', () => {
  const logger = {
    warning: sinon.spy(),
  };

  beforeEach(() => {
    logger.warning.resetHistory();
  });

  [undefined, null].forEach(value => {
    it(`should log a warning and set xpack.reporting.encryptionKey if encryptionKey is ${value}`, () => {
      const config = {
        get: sinon.stub().returns(value),
        set: sinon.stub(),
      };

      expect(() => validateConfig(config, logger)).not.to.throwError();

      sinon.assert.calledWith(config.set, 'xpack.reporting.encryptionKey');
      sinon.assert.calledWithMatch(logger.warning, /Generating a random key/);
      sinon.assert.calledWithMatch(logger.warning, /please set xpack.reporting.encryptionKey/);
    });
  });
});
