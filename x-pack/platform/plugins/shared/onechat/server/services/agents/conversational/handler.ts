/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, filter, shareReplay, firstValueFrom, map } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import { isRoundCompleteEvent } from '@kbn/onechat-common';
import type { ConversationalAgentHandlerFn } from '@kbn/onechat-server';
import { providerToLangchainTools, conversationLangchainMessages } from './utils';
import { createAgentGraph } from './graph';
import { convertGraphEvents, addRoundCompleteEvent } from './convert_graph_events';

export interface CreateConversationalAgentHandlerParams {
  logger: Logger;
}

const defaultAgentGraphName = 'default-onechat-agent';

/**
 * Create the handler function for the default onechat agent.
 */
export const createHandler = ({
  logger,
}: CreateConversationalAgentHandlerParams): ConversationalAgentHandlerFn => {
  return async (
    { agentParams: { nextInput, conversation = [] }, runId },
    { request, modelProvider, toolProvider, events, runner }
  ) => {
    const model = await modelProvider.getDefaultModel();
    const tools = await providerToLangchainTools({ request, toolProvider, runner, logger });
    const initialMessages = conversationLangchainMessages({
      nextInput,
      previousRounds: conversation,
    });
    const agentGraph = await createAgentGraph({ logger, chatModel: model.chatModel, tools });

    const eventStream = agentGraph.streamEvents(
      { initialMessages },
      {
        version: 'v2',
        runName: defaultAgentGraphName,
        metadata: {
          graphName: defaultAgentGraphName,
          runId,
        },
        recursionLimit: 10,
        callbacks: [],
      }
    );

    const events$ = from(eventStream).pipe(
      filter(isStreamEvent),
      convertGraphEvents({ graphName: defaultAgentGraphName, runName: defaultAgentGraphName }),
      addRoundCompleteEvent({ userInput: nextInput }),
      shareReplay()
    );

    events$.subscribe((event) => {
      events.emit(event);
    });

    const round = await firstValueFrom(
      events$.pipe(
        filter(isRoundCompleteEvent),
        map((event) => event.data.round)
      )
    );

    return {
      result: {
        round,
      },
    };
  };
};

const isStreamEvent = (input: any): input is StreamEvent => {
  return 'event' in input;
};
