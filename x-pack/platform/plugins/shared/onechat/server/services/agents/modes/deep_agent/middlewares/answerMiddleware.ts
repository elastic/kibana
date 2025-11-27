import { createReasoningEvent } from "@kbn/onechat-genai-utils/langchain";
import { AgentEventEmitter } from "@kbn/onechat-server";
import { createMiddleware } from "langchain";
import { steps } from "../constants";
import { getRandomAnsweringMessage } from "../i18n";

// This middleware allows us to hook into event stream and extract one chat events as well as emit answering events.
export const createAnswerMiddleware = (events: AgentEventEmitter) => {
    return createMiddleware({
      name: steps.answerAgent,
      afterAgent: (state) => {
        events.emit(createReasoningEvent(getRandomAnsweringMessage(), { transient: true }));
      },
    });
  };