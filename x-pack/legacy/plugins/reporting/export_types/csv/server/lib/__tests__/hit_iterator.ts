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

const mockSearchRequest = {};
const realCancellationToken = new CancellationToken();

const mockCallEndpoint = sinon.stub();
mockCallEndpoint.resolves({ _scroll_id: '123blah', hits: { hits: ['you found me'] } });
mockCallEndpoint.onThirdCall().resolves({ _scroll_id: '123blah', hits: {} });

const mockConfig: ScrollConfig = {
  duration: '2s',
  size: 123,
};

describe('hitIterator', function() {
  afterEach(() => {
    debugLogStub.resetHistory();
    errorLogStub.resetHistory();
    mockCallEndpoint.resetHistory();
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
  });
});
