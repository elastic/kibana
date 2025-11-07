/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { InferenceChatModel } from '@kbn/inference-langchain';

const StateAnnotation = Annotation.Root({
  // inputs
  nlQuery: Annotation<string>(),
  targetPattern: Annotation<string | undefined>(),
});

export type StateType = typeof StateAnnotation.State;

export const createGenerateEsqlGraph = ({
  chatModel,
  esClient,
  logger,
}: {
  chatModel: InferenceChatModel;
  esClient: ElasticsearchClient;
  logger: Logger;
}) => {
  // TODO

  const generationModel = chatModel.withConfig({
    tags: ['esql-gen'],
  });

  const generate = async (state: StateType) => {
    const response = await generationModel.invoke();
    return {};
  };

  return new StateGraph(StateAnnotation)
    .addNode('generate', generate)
    .addEdge('__start__', 'generate')
    .addEdge('generate', '__end__')
    .compile();
};
