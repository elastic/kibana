/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ObservabilityAIAssistantTelemetryEventType {
  ChatFeedback = 'observability_ai_assistant_chat_feedback',
  InsightFeedback = 'observability_ai_assistant_insight_feedback',
  UserSentPromptInChat = 'observability_ai_assistant_user_sent_prompt_in_chat',
  InsightResponse = 'observability_ai_assistant_insight_response',
}
