/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { IMPROVEMENTS_INTERNAL_API_VERSION } from '../../../common/constants';
import {
  getFeedbackContext,
  getFeedbackSchedule,
  putFeedbackSchedule,
  runFeedbackLoop,
} from './feedback_loop';

describe('getFeedbackContext', () => {
  it('requests the versioned context endpoint and forwards the abort signal', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ prompt: 'briefing' });
    const signal = new AbortController().signal;

    await getFeedbackContext(http, { aiIndexId: 'my-index', signal });

    expect(http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/my-index/feedback_context',
      { version: IMPROVEMENTS_INTERNAL_API_VERSION, signal }
    );
  });
});

describe('runFeedbackLoop', () => {
  it('posts to the run endpoint', async () => {
    const http = coreMock.createStart().http;
    http.post.mockResolvedValue({ execution_id: 'exec-1' });

    await runFeedbackLoop(http, { aiIndexId: 'my-index' });

    expect(http.post).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/my-index/feedback_loop/_run',
      { version: IMPROVEMENTS_INTERNAL_API_VERSION }
    );
  });
});

describe('getFeedbackSchedule', () => {
  it('requests the versioned schedule endpoint', async () => {
    const http = coreMock.createStart().http;
    http.get.mockResolvedValue({ enabled: false });

    await getFeedbackSchedule(http, { aiIndexId: 'my-index' });

    expect(http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/my-index/feedback_loop/schedule',
      { version: IMPROVEMENTS_INTERNAL_API_VERSION }
    );
  });
});

describe('putFeedbackSchedule', () => {
  it('sends the requested enablement as the body', async () => {
    const http = coreMock.createStart().http;
    http.put.mockResolvedValue({ enabled: true });

    await putFeedbackSchedule(http, { aiIndexId: 'my-index', enabled: true });

    expect(http.put).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/my-index/feedback_loop/schedule',
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        body: JSON.stringify({ enabled: true }),
      }
    );
  });
});
