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
  let mockStatusObservable;
  let mockElasticsearchPlugin;

  beforeEach(() => {
    sandbox.useFakeTimers();

    mockElasticsearchPlugin = {
      getCluster: sinon.stub(),
    };

    mockStatusObservable = sinon.stub({ subscribe() {} });

    mockServer = sinon.stub({
      plugins: {
        elasticsearch: mockElasticsearchPlugin,
      },
      newPlatform: {
        setup: {
          core: {
            status: {
              core$: {
                pipe() {
                  return mockStatusObservable;
                },
              },
            },
          },
          plugins: { features: {}, licensing: { license$: new BehaviorSubject() } },
        },
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
    sinon.assert.calledWithExactly(mockStatusObservable.subscribe, sinon.match.func);
  });
});
