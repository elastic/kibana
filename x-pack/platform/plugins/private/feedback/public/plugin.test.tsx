/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FeedbackPlugin } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { telemetryPluginMock } from '@kbn/telemetry-plugin/public/mocks';
import type { TelemetryPluginConfig } from '@kbn/telemetry-plugin/public';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';

describe('Feedback Plugin', () => {
  let coreStartMock: ReturnType<typeof coreMock.createStart>;
  let cloudStartMock: ReturnType<typeof cloudMock.createStart>;
  let telemetryStartMock: TelemetryPluginStart;
  let plugin: FeedbackPlugin;

  const resolveTelemetryOptIn = (optIn: boolean) => {
    const { telemetryService } = telemetryStartMock;
    telemetryService.config = { ...telemetryService.config, optIn } as TelemetryPluginConfig;
  };

  describe('start', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      sessionStorage.clear();
      coreStartMock = coreMock.createStart();
      cloudStartMock = cloudMock.createStart();
      telemetryStartMock = telemetryPluginMock.createStartContract();
      plugin = new FeedbackPlugin();
    });

    const enableFeedback = () => {
      coreStartMock.notifications.feedback.isEnabled.mockReturnValue(true);
    };

    it('should register feedback button when feedback is enabled', () => {
      enableFeedback();

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      expect(coreStartMock.notifications.feedback.isEnabled).toHaveBeenCalled();
      const [[{ content }]] = coreStartMock.chrome.navControls.registerRight.mock.calls;
      expect(coreStartMock.chrome.navControls.registerRight).toHaveBeenCalledWith({
        order: 1001,
        content: expect.anything(),
      });
      expect(React.isValidElement(content)).toBe(true);
    });

    it('should register feedback handler in the Chrome Next namespace when opted in', () => {
      enableFeedback();
      coreStartMock.featureFlags.getBooleanValue.mockReturnValue(true);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      expect(coreStartMock.chrome.next.registerFeedbackHandler).not.toHaveBeenCalled();

      resolveTelemetryOptIn(true);

      expect(coreStartMock.chrome.next.registerFeedbackHandler).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should not register feedback handler when Chrome Next is disabled', () => {
      enableFeedback();
      coreStartMock.featureFlags.getBooleanValue.mockReturnValue(false);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      resolveTelemetryOptIn(true);

      expect(coreStartMock.chrome.next.registerFeedbackHandler).not.toHaveBeenCalled();
    });

    it('should not register feedback button when feedback is disabled', () => {
      coreStartMock.notifications.feedback.isEnabled.mockReturnValue(false);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      expect(coreStartMock.notifications.feedback.isEnabled).toHaveBeenCalled();
      expect(coreStartMock.chrome.navControls.registerRight).not.toHaveBeenCalled();
    });

    it('should register feedback button even when sync getIsOptedIn returns false', () => {
      enableFeedback();
      jest.spyOn(telemetryStartMock.telemetryService, 'getIsOptedIn').mockReturnValue(false);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      expect(coreStartMock.chrome.navControls.registerRight).toHaveBeenCalled();
    });

    it('should not register Chrome Next feedback handler until isOptedIn$ emits true', () => {
      enableFeedback();
      coreStartMock.featureFlags.getBooleanValue.mockReturnValue(true);
      jest.spyOn(telemetryStartMock.telemetryService, 'getIsOptedIn').mockReturnValue(false);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      expect(coreStartMock.chrome.next.registerFeedbackHandler).not.toHaveBeenCalled();

      resolveTelemetryOptIn(true);

      expect(coreStartMock.chrome.next.registerFeedbackHandler).toHaveBeenCalled();
    });

    it('should unregister Chrome Next feedback handler when isOptedIn$ emits false', () => {
      enableFeedback();
      coreStartMock.featureFlags.getBooleanValue.mockReturnValue(true);
      const unregisterFeedbackHandler = jest.fn();
      coreStartMock.chrome.next.registerFeedbackHandler.mockReturnValue(unregisterFeedbackHandler);

      plugin.start(coreStartMock, { cloud: cloudStartMock, telemetry: telemetryStartMock });

      resolveTelemetryOptIn(true);
      expect(coreStartMock.chrome.next.registerFeedbackHandler).toHaveBeenCalledTimes(1);

      resolveTelemetryOptIn(false);
      expect(unregisterFeedbackHandler).toHaveBeenCalled();
    });
  });
});
