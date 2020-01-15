/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { CancellationToken } from '../../../../common/cancellation_token';
import { Logger, ScrollConfig } from '../../../../types';
import { createHitIterator } from './hit_iterator';

const mockLogger = {
  error: new Function(),
  debug: new Function(),
  warning: new Function(),
} as Logger;
const debugLogStub = sinon.stub(mockLogger, 'debug');
const warnLogStub = sinon.stub(mockLogger, 'warning');
const errorLogStub = sinon.stub(mockLogger, 'error');
const mockCallEndpoint = sinon.stub();
const mockSearchRequest = {};
const mockConfig: ScrollConfig = { duration: '2s', size: 123 };
let realCancellationToken = new CancellationToken();
let isCancelledStub: sinon.SinonStub<[], boolean>;

describe('hitIterator', function() {
  beforeEach(() => {
    debugLogStub.resetHistory();
    warnLogStub.resetHistory();
    errorLogStub.resetHistory();
    mockCallEndpoint.resetHistory();
    mockCallEndpoint.resetBehavior();
    mockCallEndpoint.resolves({ _scroll_id: '123blah', hits: { hits: ['you found me'] } });
    mockCallEndpoint.onCall(11).resolves({ _scroll_id: '123blah', hits: {} });

    isCancelledStub = sinon.stub(realCancellationToken, 'isCancelled');
    isCancelledStub.returns(false);
  });

  afterEach(() => {
    realCancellationToken = new CancellationToken();
  });

  it('iterates hits', async () => {
    // Begin
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
      expect(hit).toBe('you found me');
    }

    expect(mockCallEndpoint.callCount).toBe(13);
    expect(debugLogStub.callCount).toBe(13);
    expect(warnLogStub.callCount).toBe(0);
    expect(errorLogStub.callCount).toBe(0);
  });

  it('stops searches after cancellation', async () => {
    // Setup
    isCancelledStub.onFirstCall().returns(false);
    isCancelledStub.returns(true);

    // Begin
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
      expect(hit).toBe('you found me');
    }

    expect(mockCallEndpoint.callCount).toBe(3);
    expect(debugLogStub.callCount).toBe(3);
    expect(warnLogStub.callCount).toBe(1);
    expect(errorLogStub.callCount).toBe(0);

    expect(warnLogStub.firstCall.lastArg).toBe(
      'Any remaining scrolling searches have been cancelled by the cancellation token.'
    );
  });

  it('handles time out', async () => {
    // Setup
    mockCallEndpoint.onCall(2).resolves({ status: 404 });

    // Begin
    const hitIterator = createHitIterator(mockLogger);
    const iterator = hitIterator(
      mockConfig,
      mockCallEndpoint,
      mockSearchRequest,
      realCancellationToken
    );

    let errorThrown = false;
    try {
      while (true) {
        const { done: iterationDone, value: hit } = await iterator.next();
        if (iterationDone) {
          break;
        }
        expect(hit).toBe('you found me');
      }
    } catch (err) {
      expect(err).toMatchInlineSnapshot(
        `[Error: Expected hits in the following Elasticsearch response: {"status":404}]`
      );
      errorThrown = true;
    }

    expect(mockCallEndpoint.callCount).toBe(4);
    expect(debugLogStub.callCount).toBe(4);
    expect(warnLogStub.callCount).toBe(0);
    expect(errorLogStub.callCount).toBe(1);
    expect(errorThrown).toBe(true);
  });

  it('handles finished search', async () => {
    // Setup
    mockCallEndpoint.onCall(2).resolves({ hits: { total: 0, hits: [] } });

    // Begin
    const hitIterator = createHitIterator(mockLogger);
    const iterator = hitIterator(
      mockConfig,
      mockCallEndpoint,
      mockSearchRequest,
      realCancellationToken
    );

    let errorThrown = false;
    try {
      while (true) {
        const { done: iterationDone, value: hit } = await iterator.next();
        if (iterationDone) {
          break;
        }
        expect(hit).toBe('you found me');
      }
    } catch (err) {
      errorThrown = true;
    }

    expect(mockCallEndpoint.callCount).toBe(4);
    expect(debugLogStub.callCount).toBe(4);
    expect(warnLogStub.callCount).toBe(0);
    expect(errorLogStub.callCount).toBe(0);
    expect(errorThrown).toBe(false);
  });
});
