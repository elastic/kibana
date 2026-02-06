/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeedbackPlugin } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { telemetryPluginMock } from '@kbn/telemetry-plugin/public/mocks';

const coreStartMock = coreMock.createStart();
const cloudStartMock = cloudMock.createStart();
const telemetryStartMock = telemetryPluginMock.createStartContract();
const plugin = new FeedbackPlugin();

describe('Feedback Plugin', () => {
  describe('start', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should register feedback button when feedback is enabled, telemetry is enabled and user is opted in', () => {
      coreStartMock.notifications.feedback.isEnabled.mockReturnValue(true);
      jest.spyOn(telemetryStartMock.telemetryService, 'canSendTelemetry').mockReturnValue(true);
      jest.spyOn(telemetryStartMock.telemetryService, 'getIsOptedIn').mockReturnValue(true);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      expect(coreStartMock.notifications.feedback.isEnabled).toHaveBeenCalled();
      expect(coreStartMock.chrome.navControls.registerRight).toHaveBeenCalledWith({
        order: 1001,
        mount: expect.any(Function),
      });
    });

    it('should not register feedback button when feedback is disabled', () => {
      coreStartMock.notifications.feedback.isEnabled.mockReturnValue(false);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      expect(coreStartMock.notifications.feedback.isEnabled).toHaveBeenCalled();
      expect(coreStartMock.chrome.navControls.registerRight).not.toHaveBeenCalled();
    });

    it('should not register feedback button when telemetry is disabled', () => {
      coreStartMock.notifications.feedback.isEnabled.mockReturnValue(true);
      jest.spyOn(telemetryStartMock.telemetryService, 'canSendTelemetry').mockReturnValue(false);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      expect(coreStartMock.notifications.feedback.isEnabled).toHaveBeenCalled();
      expect(telemetryStartMock.telemetryService.canSendTelemetry).toHaveBeenCalled();
      expect(coreStartMock.chrome.navControls.registerRight).not.toHaveBeenCalled();
    });

    it('should not register feedback button when user is opted out of telemetry', () => {
      coreStartMock.notifications.feedback.isEnabled.mockReturnValue(true);
      jest.spyOn(telemetryStartMock.telemetryService, 'canSendTelemetry').mockReturnValue(true);
      jest.spyOn(telemetryStartMock.telemetryService, 'getIsOptedIn').mockReturnValue(false);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      expect(coreStartMock.notifications.feedback.isEnabled).toHaveBeenCalled();
      expect(telemetryStartMock.telemetryService.canSendTelemetry).toHaveBeenCalled();
      expect(telemetryStartMock.telemetryService.getIsOptedIn).toHaveBeenCalled();
      expect(coreStartMock.chrome.navControls.registerRight).not.toHaveBeenCalled();
    });
  });
});
