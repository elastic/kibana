import { AgentEventEmitter } from "@kbn/agent-builder-server/agents";
import { steps } from "../constants";
import { createMiddleware } from "langchain";

/**
 * The purpose of this middleware is to provide a location that we can hook into
 * while converting the graph events to the OneChat events.
 *
 * We need to hook into the afterModel step to be able to extract the tool calls
 * from the last message and emit the corresponding OneChat events.
 *
 * Aside from that, this hook is a no-op.
 */
export const createResearchMiddleware = (events: AgentEventEmitter) => {
    return createMiddleware({
        name: steps.researchAgent,
        afterModel: (state) => {
        },
    });
};