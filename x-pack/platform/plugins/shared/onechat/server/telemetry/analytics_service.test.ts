/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AGENT_BUILDER_EVENT_TYPES, agentBuilderServerEbtEvents } from '@kbn/onechat-common';
import type {
  ReportMessageReceivedParams,
  ReportMessageSentParams,
} from '@kbn/onechat-common/telemetry';
import { AnalyticsService } from './analytics_service';

describe('AnalyticsService', () => {
  let analytics: jest.Mocked<Pick<AnalyticsServiceSetup, 'registerEventType' | 'reportEvent'>>;
  let logger: MockedLogger;
  let service: AnalyticsService;

  const messageSentParams: ReportMessageSentParams = {
    conversation_id: 'conversation-1',
    has_attachments: false,
  };

  const messageReceivedParams: ReportMessageReceivedParams = {
    conversation_id: 'conversation-1',
    tools_invoked: [],
  };

  beforeEach(() => {
    analytics = {
      registerEventType: jest.fn(),
      reportEvent: jest.fn(),
    };
    logger = loggerMock.create();
    service = new AnalyticsService(analytics as unknown as AnalyticsServiceSetup, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerAgentBuilderEventTypes', () => {
    beforeEach(() => {
      service.registerAgentBuilderEventTypes();
    });

    describe.each(agentBuilderServerEbtEvents)('eventType: $eventType', (eventConfig) => {
      it('registers the event type', () => {
        expect(analytics.registerEventType).toHaveBeenCalledWith(eventConfig);
      });
    });
  });

  describe('reportMessageSent', () => {
    it('reports the event', () => {
      service.reportMessageSent(messageSentParams);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        AGENT_BUILDER_EVENT_TYPES.MessageSent,
        messageSentParams
      );
    });

    it('does not throw if reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => service.reportMessageSent(messageSentParams)).not.toThrow();
    });

    it('logs debug if reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      service.reportMessageSent(messageSentParams);

      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe('reportMessageReceived', () => {
    it('reports the event', () => {
      service.reportMessageReceived(messageReceivedParams);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        AGENT_BUILDER_EVENT_TYPES.MessageReceived,
        messageReceivedParams
      );
    });

    it('does not throw if reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => service.reportMessageReceived(messageReceivedParams)).not.toThrow();
    });

    it('logs debug if reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      service.reportMessageReceived(messageReceivedParams);

      expect(logger.debug).toHaveBeenCalled();
    });
  });
});


