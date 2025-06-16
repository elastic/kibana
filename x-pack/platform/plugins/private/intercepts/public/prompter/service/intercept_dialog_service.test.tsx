/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { InterceptDialogService } from './intercept_dialog_service';

const staticAssetsHelperMock = httpServiceMock.createSetupContract().staticAssets;

describe('InterceptDialogService', () => {
  it('exposes a setup and start method', () => {
    const interceptDialogService = new InterceptDialogService();

    expect(interceptDialogService).toHaveProperty('setup', expect.any(Function));
    expect(interceptDialogService).toHaveProperty('start', expect.any(Function));
    expect(interceptDialogService).toHaveProperty('stop', expect.any(Function));
  });

  describe('#start', () => {
    let start: ReturnType<InterceptDialogService['start']>;

    const interceptDialogService = new InterceptDialogService();

    beforeAll(() => {
      interceptDialogService.setup({
        analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
        notifications: notificationServiceMock.createSetupContract(),
      });
    });

    beforeEach(() => {
      start = interceptDialogService.start({
        analytics: analyticsServiceMock.createAnalyticsServiceStart(),
        rendering: renderingServiceMock.create(),
        targetDomElement: document.createElement('div'),
        persistInterceptRunId: jest.fn(),
        staticAssetsHelper: staticAssetsHelperMock,
      });
    });

    afterEach(() => {
      interceptDialogService.stop();
    });

    it('exposes an expected set of properties', () => {
      expect(start).toStrictEqual({
        add: expect.any(Function),
      });
    });
  });
});
