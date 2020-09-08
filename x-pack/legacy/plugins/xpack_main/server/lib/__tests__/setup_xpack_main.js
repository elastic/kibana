/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import sinon from 'sinon';
import { XPackInfo } from '../xpack_info';
import { setupXPackMain } from '../setup_xpack_main';

describe('setupXPackMain()', () => {
  const sandbox = sinon.createSandbox();

  let mockServer;
  let mockElasticsearchPlugin;
  let mockXPackMainPlugin;

  beforeEach(() => {
    sandbox.useFakeTimers();

    mockElasticsearchPlugin = {
      getCluster: sinon.stub(),
      status: sinon.stub({
        on() {},
      }),
    };

    mockXPackMainPlugin = {
      status: sinon.stub({
        green() {},
        red() {},
      }),
    };

    mockServer = sinon.stub({
      plugins: {
        elasticsearch: mockElasticsearchPlugin,
        xpack_main: mockXPackMainPlugin,
      },
      newPlatform: {
        setup: { plugins: { features: {}, licensing: { license$: new BehaviorSubject() } } },
      },
      events: { on() {} },
      log() {},
      config() {},
      expose() {},
      ext() {},
    });

    // Make sure plugins doesn't consume config
    const configGetStub = sinon
      .stub()
      .throws(new Error('`config.get` is called with unexpected key.'));
    mockServer.config.returns({ get: configGetStub });
  });

  afterEach(() => sandbox.restore());

  it('all extension hooks should be properly initialized.', () => {
    setupXPackMain(mockServer);

    sinon.assert.calledWithExactly(mockServer.expose, 'info', sinon.match.instanceOf(XPackInfo));
    sinon.assert.calledWithExactly(mockElasticsearchPlugin.status.on, 'change', sinon.match.func);
  });

  describe('Elasticsearch plugin state changes cause XPackMain plugin state change.', () => {
    let xPackInfo;
    let onElasticsearchPluginStatusChange;
    beforeEach(() => {
      setupXPackMain(mockServer);

      onElasticsearchPluginStatusChange = mockElasticsearchPlugin.status.on.withArgs('change')
        .firstCall.args[1];
      xPackInfo = mockServer.expose.firstCall.args[1];
    });

    it('if `XPackInfo` is available status will become `green`.', async () => {
      sinon.stub(xPackInfo, 'isAvailable').returns(false);
      // We need this to make sure the code waits for `refreshNow` to complete before it tries
      // to access its properties.
      sinon.stub(xPackInfo, 'refreshNow').callsFake(() => {
        return new Promise((resolve) => {
          xPackInfo.isAvailable.returns(true);
          resolve();
        });
      });

      await onElasticsearchPluginStatusChange();

      sinon.assert.calledWithExactly(mockXPackMainPlugin.status.green, 'Ready');
      sinon.assert.notCalled(mockXPackMainPlugin.status.red);
    });

    it('if `XPackInfo` is not available status will become `red`.', async () => {
      sinon.stub(xPackInfo, 'isAvailable').returns(true);
      sinon.stub(xPackInfo, 'unavailableReason').returns('');

      // We need this to make sure the code waits for `refreshNow` to complete before it tries
      // to access its properties.
      sinon.stub(xPackInfo, 'refreshNow').callsFake(() => {
        return new Promise((resolve) => {
          xPackInfo.isAvailable.returns(false);
          xPackInfo.unavailableReason.returns('Some weird error.');
          resolve();
        });
      });

      await onElasticsearchPluginStatusChange();

      sinon.assert.calledWithExactly(mockXPackMainPlugin.status.red, 'Some weird error.');
      sinon.assert.notCalled(mockXPackMainPlugin.status.green);
    });
  });
});
