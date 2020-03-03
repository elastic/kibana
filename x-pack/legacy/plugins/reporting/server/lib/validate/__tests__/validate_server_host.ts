/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { ServerFacade } from '../../../../types';
import { validateServerHost } from '../validate_server_host';

const configKey = 'xpack.reporting.kibanaServer.hostname';

describe('Reporting: Validate server host setting', () => {
  it(`should log a warning and set ${configKey} if server.host is "0"`, () => {
    const getStub = sinon.stub();
    getStub.withArgs('server.host').returns('0');
    getStub.withArgs(configKey).returns(undefined);
    const config = {
      get: getStub,
      set: sinon.stub(),
    };

    expect(() =>
      validateServerHost(({ config: () => config } as unknown) as ServerFacade)
    ).to.throwError();

    sinon.assert.calledWith(config.set, configKey);
  });
});
