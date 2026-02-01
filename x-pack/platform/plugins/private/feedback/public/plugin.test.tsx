/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeedbackPlugin } from './plugin';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';

const coreStartMock = coreMock.createStart();
const licensingStartMock = licensingMock.createStart();
const plugin = new FeedbackPlugin();

describe('Feedback Plugin', () => {
  describe('start', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should register feedback button when feedback is enabled', () => {
      coreStartMock.notifications.feedback.isEnabled.mockReturnValue(true);
      plugin.start(coreStartMock, { licensing: licensingStartMock });

      expect(coreStartMock.notifications.feedback.isEnabled).toHaveBeenCalled();
      expect(coreStartMock.chrome.navControls.registerRight).toHaveBeenCalledWith({
        order: 1000,
        mount: expect.any(Function),
      });
    });

    it('should not register feedback button when feedback is disabled', () => {
      coreStartMock.notifications.feedback.isEnabled.mockReturnValue(false);
      plugin.start(coreStartMock, { licensing: licensingStartMock });

      expect(coreStartMock.notifications.feedback.isEnabled).toHaveBeenCalled();
      expect(coreStartMock.chrome.navControls.registerRight).not.toHaveBeenCalled();
    });
  });
});
