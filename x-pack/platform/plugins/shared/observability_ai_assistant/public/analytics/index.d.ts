import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ChatFeedback } from './schemas/chat_feedback';
import type { InsightFeedback } from './schemas/insight_feedback';
import type { InsightResponse } from './schemas/insight_response';
import type { UserSentPrompt } from './schemas/user_sent_prompt';
import type { ObservabilityAIAssistantTelemetryEventType } from './telemetry_event_type';
export type TelemetryEventTypeWithPayload = {
    type: ObservabilityAIAssistantTelemetryEventType.ChatFeedback;
    payload: ChatFeedback;
} | {
    type: ObservabilityAIAssistantTelemetryEventType.InsightFeedback;
    payload: InsightFeedback;
} | {
    type: ObservabilityAIAssistantTelemetryEventType.UserSentPromptInChat;
    payload: UserSentPrompt;
} | {
    type: ObservabilityAIAssistantTelemetryEventType.InsightResponse;
    payload: InsightResponse;
};
export declare const registerTelemetryEventTypes: (analytics: AnalyticsServiceSetup) => void;
export declare function sendEvent(analytics: AnalyticsServiceStart, eventType: TelemetryEventTypeWithPayload): void;
