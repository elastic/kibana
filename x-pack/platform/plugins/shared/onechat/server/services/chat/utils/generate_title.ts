/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, shareReplay, switchMap, Observable } from 'rxjs';
import { z } from '@kbn/zod';
import { BaseMessageLike } from '@langchain/core/messages';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ElasticGenAIAttributes, withInferenceSpan } from '@kbn/inference-tracing';
import type { Conversation, ConversationRound, RoundInput } from '@kbn/onechat-common';
import { conversationToLangchainMessages } from '../../agents/modes/utils';

export const generateTitle$ = ({
  chatModel,
  conversation$,
  nextInput,
}: {
  chatModel: InferenceChatModel;
  conversation$: Observable<Conversation>;
  nextInput: RoundInput;
}): Observable<string> => {
  return conversation$.pipe(
    switchMap((conversation) => {
      return defer(async () =>
        generateConversationTitle({
          previousRounds: conversation.rounds,
          nextInput,
          chatModel,
        })
      ).pipe(shareReplay());
    })
  );
};

export const generateConversationTitle = async ({
  previousRounds,
  nextInput,
  chatModel,
}: {
  previousRounds: ConversationRound[];
  nextInput: RoundInput;
  chatModel: InferenceChatModel;
}) => {
  return withInferenceSpan(
    { name: 'generate_title', [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' },
    async (span) => {
      const structuredModel = chatModel.withStructuredOutput(
        z.object({
          title: z.string().describe('The title for the conversation'),
        })
      );

      const prompt: BaseMessageLike[] = [
        [
          'system',
          "'You are a helpful assistant. Assume the following messages is the start of a conversation between you and a user; give this conversation a title based on the content below",
        ],
        ...conversationToLangchainMessages({ previousRounds, nextInput }),
      ];

      const { title } = await structuredModel.invoke(prompt);

      span?.setAttribute('output.value', title);

      return title;
    }
  );
};
