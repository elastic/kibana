import { createReasoningEvent } from "@kbn/onechat-genai-utils/langchain";
import { AgentEventEmitter } from "@kbn/onechat-server";
import { createMiddleware } from "langchain";
import { getRandomThinkingMessage } from "../i18n";

// This middleware allows us to hook into graph execution and emit reasoning events.
export const createReasoningEventMiddleware = (events: AgentEventEmitter) => {
    return createMiddleware({
      name: "reasoningEventMiddleware",
      beforeModel: () => {
        events.emit(createReasoningEvent(getRandomThinkingMessage(), { transient: true }));
      },
    });
  };