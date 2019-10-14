/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LensReportManager,
  setReportManager,
  stopReportManager,
  trackUiEvent,
  trackSuggestionEvent,
} from './factory';
import { Storage } from 'src/legacy/core_plugins/data/public/types';
import { coreMock } from 'src/core/public/mocks';
import { HttpServiceBase } from 'kibana/public';

jest.useFakeTimers();

const createMockStorage = () => ({
  // store: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

describe('Lens UI telemetry', () => {
  let storage: jest.Mocked<Storage>;
  let http: jest.Mocked<HttpServiceBase>;

  beforeEach(() => {
    storage = createMockStorage();
    http = coreMock.createSetup().http;
    const fakeManager = new LensReportManager({
      http,
      storage,
      basePath: '/basepath',
    });
    setReportManager(fakeManager);
  });

  afterEach(() => {
    stopReportManager();
  });

  it('should write immediately and track local state', () => {
    trackUiEvent('loaded');

    expect(storage.set).toHaveBeenCalledWith('lens-ui-telemetry', {
      clicks: [
        {
          name: 'loaded',
          date: expect.any(String),
        },
      ],
      suggestionClicks: [],
    });

    trackSuggestionEvent('reload');

    expect(storage.set).toHaveBeenLastCalledWith('lens-ui-telemetry', {
      clicks: [
        {
          name: 'loaded',
          date: expect.any(String),
        },
      ],
      suggestionClicks: [
        {
          name: 'reload',
          date: expect.any(String),
        },
      ],
    });
  });

  it('should post the results after waiting 10 seconds, if there is data', () => {
    jest.runTimersToTime(10000);

    expect(http.post).not.toHaveBeenCalled();

    trackUiEvent('load');

    jest.runTimersToTime(10000);

    expect(http.post).toHaveBeenCalledWith(`/basepath/api/lens/telemetry`, {
      // The contents of the body are not checked here because they depend on time
      body: expect.any(String),
    });

    expect(storage.set).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenLastCalledWith('lens-ui-telemetry', {
      clicks: [],
      suggestionClicks: [],
    });
  });

  it('should keep its local state after an http error', () => {
    http.post.mockRejectedValue('http error');

    trackUiEvent('load');
    expect(storage.set).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10000);

    expect(http.post).toHaveBeenCalled();
    expect(storage.set).toHaveBeenCalledTimes(1);
  });
});
