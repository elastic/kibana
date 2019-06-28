/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { XPackInfo } from '../xpack_info';
import { setupXPackMain } from '../setup_xpack_main';
import * as InjectXPackInfoSignatureNS from '../inject_xpack_info_signature';

describe('setupXPackMain()', () => {
  const sandbox = sinon.createSandbox();

  let mockServer;
  let mockElasticsearchPlugin;
  let mockXPackMainPlugin;

  beforeEach(() => {
    sandbox.useFakeTimers();
    sandbox.stub(InjectXPackInfoSignatureNS, 'injectXPackInfoSignature');

    mockElasticsearchPlugin = {
      getCluster: sinon.stub(),
      status: sinon.stub({
        on() {}
      })
    };

    mockXPackMainPlugin = {
      status: sinon.stub({
        green() {},
        red() {}
      })
    };

    mockServer = sinon.stub({
      plugins: {
        elasticsearch: mockElasticsearchPlugin,
        xpack_main: mockXPackMainPlugin
      },
      events: { on() {} },
      log() {},
      config() {},
      expose() {},
      ext() {}
    });

    // Make sure we don't misspell config key.
    const configGetStub = sinon.stub().throws(new Error('`config.get` is called with unexpected key.'));
    configGetStub.withArgs('xpack.xpack_main.xpack_api_polling_frequency_millis').returns(1234);
    mockServer.config.returns({ get: configGetStub });
  });

  afterEach(() => sandbox.restore());

  it('all extension hooks should be properly initialized.', () => {
    setupXPackMain(mockServer);

    sinon.assert.calledWithExactly(mockServer.expose, 'info', sinon.match.instanceOf(XPackInfo));
    sinon.assert.calledWithExactly(mockServer.ext, 'onPreResponse', sinon.match.func);
    sinon.assert.calledWithExactly(mockElasticsearchPlugin.status.on, 'change', sinon.match.func);
  });

  it('onPreResponse hook calls `injectXPackInfoSignature` for every request.', () => {
    setupXPackMain(mockServer);

    const xPackInfo = mockServer.expose.firstCall.args[1];
    const onPreResponse = mockServer.ext.firstCall.args[1];

    const mockRequest = {};
    const mockReply = sinon.stub();

    onPreResponse(mockRequest, mockReply);

    sinon.assert.calledWithExactly(
      InjectXPackInfoSignatureNS.injectXPackInfoSignature,
      xPackInfo,
      sinon.match.same(mockRequest),
      sinon.match.same(mockReply)
    );
  });

  describe('Elasticsearch plugin state changes cause XPackMain plugin state change.', () => {
    let xPackInfo;
    let onElasticsearchPluginStatusChange;
    beforeEach(() => {
      setupXPackMain(mockServer);

      onElasticsearchPluginStatusChange = mockElasticsearchPlugin.status.on
        .withArgs('change').firstCall.args[1];
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
