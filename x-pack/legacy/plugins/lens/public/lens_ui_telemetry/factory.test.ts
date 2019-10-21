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

const createMockStorage = () => {
  let lastData = { events: {}, suggestionEvents: {} };
  return {
    get: jest.fn().mockImplementation(() => lastData),
    set: jest.fn().mockImplementation((key, value) => {
      lastData = value;
    }),
    remove: jest.fn(),
    clear: jest.fn(),
  };
};

describe('Lens UI telemetry', () => {
  let storage: jest.Mocked<Storage>;
  let http: jest.Mocked<HttpServiceBase>;
  let dateSpy: jest.SpyInstance;

  beforeEach(() => {
    dateSpy = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date(Date.UTC(2019, 9, 23)).valueOf());

    storage = createMockStorage();
    http = coreMock.createSetup().http;
    http.post.mockClear();
    const fakeManager = new LensReportManager({
      http,
      storage,
      basePath: '/basepath',
    });
    setReportManager(fakeManager);
  });

  afterEach(() => {
    stopReportManager();
    dateSpy.mockRestore();
  });

  it('should write immediately and track local state', () => {
    trackUiEvent('loaded');

    expect(storage.set).toHaveBeenCalledWith('lens-ui-telemetry', {
      events: expect.any(Object),
      suggestionEvents: {},
    });

    trackSuggestionEvent('reload');

    expect(storage.set).toHaveBeenLastCalledWith('lens-ui-telemetry', {
      events: expect.any(Object),
      suggestionEvents: expect.any(Object),
    });
  });

  it('should post the results after waiting 10 seconds, if there is data', async () => {
    jest.runOnlyPendingTimers();

    http.post.mockResolvedValue({});

    expect(http.post).not.toHaveBeenCalled();
    expect(storage.set).toHaveBeenCalledTimes(0);

    trackUiEvent('load');
    expect(storage.set).toHaveBeenCalledTimes(1);

    jest.runOnlyPendingTimers();

    expect(http.post).toHaveBeenCalledWith(`/basepath/api/lens/telemetry`, {
      body: JSON.stringify({
        events: {
          '2019-10-23': {
            load: 1,
          },
        },
        suggestionEvents: {},
      }),
    });
  });

  it('should keep its local state after an http error', () => {
    http.post.mockRejectedValue('http error');

    trackUiEvent('load');
    expect(storage.set).toHaveBeenCalledTimes(1);

    jest.runOnlyPendingTimers();

    expect(http.post).toHaveBeenCalled();
    expect(storage.set).toHaveBeenCalledTimes(1);
  });
});
