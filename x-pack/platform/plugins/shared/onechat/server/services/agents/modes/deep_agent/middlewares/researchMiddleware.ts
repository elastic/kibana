import { AgentEventEmitter } from "@kbn/onechat-server";
import { createMiddleware } from "langchain";
import { steps } from "../constants";

export const createResearchMiddleware = (events: AgentEventEmitter) => {
    return createMiddleware({
      name: steps.researchAgent,
      afterModel: (state) => {
      },
    });
  };