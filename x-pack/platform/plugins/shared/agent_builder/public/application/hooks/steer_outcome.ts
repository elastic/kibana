/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import type { UserMessageEvent } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type { SteerConversationResponse } from '../../../common/http_api/conversations';

const labels = {
  awaitingPrompt: i18n.translate('xpack.agentBuilder.conversationInput.steer.awaitingPrompt', {
    defaultMessage: 'The agent is waiting for your answer to its question. Answer it first.',
  }),
  notSteerable: i18n.translate('xpack.agentBuilder.conversationInput.steer.notSteerable', {
    defaultMessage: 'Messages cannot be sent to a running agent in a public conversation.',
  }),
  tooManyPending: i18n.translate('xpack.agentBuilder.conversationInput.steer.tooManyPending', {
    defaultMessage: 'The agent already has several unread messages. Wait for it to catch up.',
  }),
};

export type SteerOutcome =
  /** Stored by this request or an earlier one: the event as the server holds it. */
  | { kind: 'stored'; event: UserMessageEvent }
  /** No run holds the conversation and nothing is stored: the message starts a run instead. */
  | { kind: 'converse' }
  /** Refused by the server, with the reason to show. */
  | { kind: 'refused'; title: string }
  /** No answer: the request may or may not have landed. */
  | { kind: 'unanswered' };

export interface SteerRequest {
  conversationId: string;
  message: string;
  /** The idempotency key; a retry under the same id stores nothing twice. */
  eventId: string;
}

/** The transport the request goes through: the conversations service, or a stand-in. */
export interface SteerTransport {
  steer(request: SteerRequest): Promise<SteerConversationResponse>;
}

const agentBuilderErrorCode = (error: unknown): string | undefined =>
  (error as IHttpFetchError<{ attributes?: { code?: string } }>)?.body?.attributes?.code;

/** A 4xx without a steer code (not found, forbidden, invalid): refused before anything was written. */
const isAnsweredRefusal = (error: unknown): boolean => {
  const status = (error as IHttpFetchError)?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
};

/** Whether the ordinary send was refused because a run holds the conversation. */
export const isConversationBusyRejection = (error: unknown): boolean =>
  agentBuilderErrorCode(error) === AgentBuilderErrorCode.conversationBusy;

/** What a failed steer request means, from the error code the route answered with. */
export const steerErrorOutcome = (error: unknown): Exclude<SteerOutcome, { kind: 'stored' }> => {
  switch (agentBuilderErrorCode(error)) {
    case AgentBuilderErrorCode.noActiveExecution:
      return { kind: 'converse' };
    case AgentBuilderErrorCode.conversationAwaitingPrompt:
      return { kind: 'refused', title: labels.awaitingPrompt };
    case AgentBuilderErrorCode.conversationNotSteerable:
      return { kind: 'refused', title: labels.notSteerable };
    case AgentBuilderErrorCode.tooManyPendingSteers:
      return { kind: 'refused', title: labels.tooManyPending };
  }
  if (isAnsweredRefusal(error)) {
    return { kind: 'refused', title: formatAgentBuilderErrorMessage(error) };
  }
  return { kind: 'unanswered' };
};

/** Sends one steer request and says what came of it. No React: the hook owns retries and effects. */
export const requestSteer = async (
  transport: SteerTransport,
  request: SteerRequest
): Promise<SteerOutcome> => {
  try {
    const { event } = await transport.steer(request);
    return { kind: 'stored', event };
  } catch (error) {
    return steerErrorOutcome(error);
  }
};
