/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { CancellationToken } from '../../../../../common/cancellation_token';
import { Logger, ScrollConfig } from '../../../../../types';
import { createHitIterator } from '../hit_iterator';

const mockLogger = {
  error: new Function(),
  debug: new Function(),
} as Logger;
const debugLogStub = sinon.stub(mockLogger, 'debug');
const errorLogStub = sinon.stub(mockLogger, 'error');
const mockCallEndpoint = sinon.stub();
const mockSearchRequest = {};
const mockConfig: ScrollConfig = { duration: '2s', size: 123 };
let realCancellationToken = new CancellationToken();
let isCancelledStub: sinon.SinonStub;

describe('hitIterator', function() {
  beforeEach(() => {
    debugLogStub.resetHistory();
    errorLogStub.resetHistory();
    mockCallEndpoint.resetHistory();
    mockCallEndpoint.resetBehavior();
    mockCallEndpoint.resolves({ _scroll_id: '123blah', hits: { hits: ['you found me'] } });
    mockCallEndpoint.onThirdCall().resolves({ _scroll_id: '123blah', hits: {} });

    isCancelledStub = sinon.stub(realCancellationToken, 'isCancelled');
    isCancelledStub.returns(false);
  });

  afterEach(() => {
    realCancellationToken = new CancellationToken();
  });

  it('iterates hits', async () => {
    const hitIterator = createHitIterator(mockLogger);
    const iterator = hitIterator(
      mockConfig,
      mockCallEndpoint,
      mockSearchRequest,
      realCancellationToken
    );

    while (true) {
      const { done: iterationDone, value: hit } = await iterator.next();
      if (iterationDone) {
        break;
      }
      expect(hit).to.be('you found me');
    }

    expect(mockCallEndpoint.callCount).to.be(4);
    expect(debugLogStub.callCount).to.be(4);
    expect(errorLogStub.callCount).to.be(0);
  });

  it('obeys cancellation', async () => {
    isCancelledStub.onSecondCall().returns(true);
    const hitIterator = createHitIterator(mockLogger);
    const iterator = hitIterator(
      mockConfig,
      mockCallEndpoint,
      mockSearchRequest,
      realCancellationToken
    );

    while (true) {
      const { done: iterationDone, value: hit } = await iterator.next();
      if (iterationDone) {
        break;
      }
      expect(hit).to.be('you found me');
    }

    expect(mockCallEndpoint.callCount).to.be(3);
    expect(debugLogStub.callCount).to.be(3);
    expect(errorLogStub.callCount).to.be(0);
  });
});
