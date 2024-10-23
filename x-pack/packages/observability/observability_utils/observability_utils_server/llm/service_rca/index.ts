/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-plugin/common';
import {
  ChatCompletionEvent,
  ChatCompletionEventType,
  ChatCompletionMessageEvent,
  ToolMessage,
  UserMessage,
} from '@kbn/inference-plugin/common/chat_complete';
import { catchError, from, merge, Observable, of, OperatorFunction, switchMap } from 'rxjs';
import { ToolCallsOf, ToolChoiceType } from '@kbn/inference-plugin/common/chat_complete/tools';
import { callTools } from '../call_tools';
import {
  analyzeEntityHealth,
  EntityHealthAnalysis,
  EntityHealthAnalysisParameters,
} from './analyze_entity_health';
import { RCA_SYSTEM_PROMPT_BASE } from './system_prompt_base';
import { findRelatedEntitiesViaKeywordSearches } from './find_related_entities_via_keyword_searches';
import { writeKeywordSearch } from './write_keyword_search';
import { writeRcaReport } from './write_rca_report';
import { generateSignificantEventsTimeline, SignificantEventsTimeline } from './generate_timeline';

const tools = {
  // findRelatedServices: {
  //   description: `Find related services to the current entity that might
  //       be needed in your investigation.`,
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       context: {
  //         type: 'string',
  //         description: `Any context that you want to provide to the agent that will
  //             try to find related services to your investigation. Use this to
  //             tell the agent what you are looking for, and what data can be used to
  //             search for it. For instance, provide IP addresses, ports, URL paths,
  //             transaction names, span ids etc`,
  //       },
  //     },
  //     required: ['context'],
  //   },
  // },
  concludeAnalysis: {
    description: `Use this when your investigation is finished.
    
    This happens when you have identified the root cause, or
    do not have any reasonable hypothesis or the capabilities
    to verify the hypothesis. Summarize the reason for
    concluding the investigation. This context will be given
    to the lead SRE to write a thorough RCA report, in
    addition to the rest of the investigation.`,
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
        },
      },
      required: ['reason'],
    },
  },
  hypothesize: {
    description: `Use this to form a hypothesis. For a hypothesis,
    consider the pieces of evidence, the capabilities you have,
    and next steps that can provide further evidence of the
    correctness of the hypothesis. Form one or two sentences
    that will be displayed by the user. After this, your
    hypothesis will be displayed to the user and you can
    execute your next step.`,
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: `The text to be displayed to the user.
          Mention a hypothesis, and the next step in your
          process to verify or reject this hypothesis.`,
        },
      },
      required: ['content'],
    },
  },
  findRelatedEntities: {
    description: `Find related entities via keyword searches, based
    on data from the investigation`,
    schema: {
      type: 'object',
      properties: {
        groupBy: {
          type: 'string',
          description: `The field to group data by, such as "service.name"
          or "host.name"`,
        },
        context: {
          type: 'string',
          description: `Additional context that you want to provide to the agent
          that will try to find the related entities.  If applicable, mention
          whether you are looking for an upstream or downstream service, and
          the pieces of data that could be relevant.
          E.g., use this to describe what you are looking for, such as "I'm
          investigating an issue for \`${JSON.stringify({
            'service.name': 'opbeans-java',
          })}\`. I'm looking for an upstream service that is running on
          10.44.0.11 that might be exhibiting availability issues which
          causes issues in the investigated service."`,
        },
      },
      required: ['groupBy', 'context'],
    },
  },
  analyzeEntityHealth: {
    description: `Analyze the health of a related entity.  Only use this tool if
    you have evidence of the entity existing with the exact field-value pairs.`,
    schema: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          description: `Any context that you want to provide to the agent that will
          analyze the entity health, such as hypotheses from your previous
          investigations. For instance, mention the reason why you are
          investigating this entity, and how it could be relevant to your
          investigation, and what symptoms you are looking for.`,
        },
        entity: {
          type: 'object',
          description: `The entity you want to investigate, such as a service. Use
          the Elasticsearch field names and values. For example, for services, use
          the following structure: ${JSON.stringify({
            entity: { fields: [{ field: 'service.name', value: 'opbeans-java' }] },
          })}`,
          properties: {
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  value: {
                    type: 'string',
                  },
                },
              },
            },
          },
          required: ['fields'],
        },
      },
      required: ['entity', 'context'],
    },
  },
} as const;

export type ToolErrorMessage = ToolMessage<{
  error: {
    message: string;
  };
}>;

type HypothesisToolMessage = ToolMessage<{
  content: string;
}>;

type ConcludeAnalysisToolMessage = ToolMessage<{
  report: string;
  timeline: SignificantEventsTimeline;
}>;

type FindRelatedEntitiesViaKeywordSearchesToolMessage = ToolMessage<{
  relatedEntitiesSummary: string;
}>;

export type AnalyzeEntityHealthToolMessage = ToolMessage<{
  instructions: string;
  analysis?: Omit<EntityHealthAnalysis, 'attachments'>;
}> & {
  data?: { attachments: EntityHealthAnalysis['attachments'] };
};

export type RootCauseAnalysisForServiceEvent =
  | ChatCompletionEvent<{ tools: typeof tools }>
  | RootCauseAnalysisToolMessage
  | ToolErrorMessage
  | UserMessage;

export type RootCauseAnalysisToolRequest = ToolCallsOf<{
  tools: typeof tools;
}>['toolCalls'][number];

export type RootCauseAnalysisToolMessage =
  | FindRelatedEntitiesViaKeywordSearchesToolMessage
  | AnalyzeEntityHealthToolMessage
  | ConcludeAnalysisToolMessage
  | HypothesisToolMessage;

export function runRootCauseAnalysisForService({
  serviceName,
  start,
  end,
  esClient,
  alertsClient,
  rulesClient,
  sloSummaryIndices,
  logSources,
  spaceId,
  connectorId,
  inferenceClient,
  context,
  logger,
}: Omit<EntityHealthAnalysisParameters, 'entity'> & {
  serviceName: string;
}): Observable<RootCauseAnalysisForServiceEvent> {
  const entity = { 'service.name': serviceName };

  const initialMessage = {
    role: MessageRole.User as const,
    content: `Investigate the health status of ${JSON.stringify(entity)}.
    
    The context given for this investigation is:

    ${context}


    `,
  };

  const next$ = callTools(
    {
      system: `${RCA_SYSTEM_PROMPT_BASE}

      Your goal is to help the user perform a root cause analysis for an
      entity. You analyze its health status, by looking at log patterns,
      and open alerts and SLOs. Additionally, you can investigate other
      entities related to the currently investigated entity. Continue
      your investigation as long as you have strong indicators that
      the root cause of an incident is actually occurring in a related
      entity.

      The user is not able to chat with you directly, so do not ask
      them what to do.
      
      Keep the user informed of your plan using the "hypothesize"
      tool, and conclude your investigation by using the
      "concludeAnalysis" tool.
      `,
      connectorId,
      inferenceClient,
      messages: [initialMessage],
      tools,
      toolChoice: ToolChoiceType.required,
    },
    ({ toolCalls, messages }) => {
      return merge(
        ...toolCalls.map((toolCall) => {
          function catchToolCallError<T>(): OperatorFunction<T, T | ToolErrorMessage> {
            return catchError((error) => {
              logger.error(`Failed executing task: ${error.message}`);
              logger.error(JSON.stringify({ error, toolCall }));
              const toolErrorMessage: ToolErrorMessage = {
                role: MessageRole.Tool,
                response: {
                  error: {
                    message: error.message,
                  },
                },
                toolCallId: toolCall.toolCallId,
              };
              return of(toolErrorMessage);
            });
          }

          switch (toolCall.function.name) {
            case 'concludeAnalysis': {
              return from(
                writeRcaReport({
                  connectorId,
                  inferenceClient,
                  messages,
                  reason: toolCall.function.arguments.reason,
                })
                  .then(async (report) => {
                    return {
                      report,
                      timeline: await generateSignificantEventsTimeline({
                        inferenceClient,
                        connectorId,
                        report,
                      }),
                    };
                  })
                  .then(({ report, timeline }) => {
                    const toolMessage: ConcludeAnalysisToolMessage = {
                      role: MessageRole.Tool,
                      toolCallId: toolCall.toolCallId,
                      response: {
                        report,
                        timeline,
                      },
                    };
                    return toolMessage;
                  })
              ).pipe(
                switchMap((toolMessage) => {
                  const emptyAssistantMessage: ChatCompletionMessageEvent<{ tools: typeof tools }> =
                    {
                      type: ChatCompletionEventType.ChatCompletionMessage,
                      content: '',
                      toolCalls: [],
                    };

                  return of(toolMessage, emptyAssistantMessage);
                }),
                catchToolCallError()
              );
            }

            case 'hypothesize':
              return of({
                role: MessageRole.Tool as const,
                toolCallId: toolCall.toolCallId,
                response: {
                  content: toolCall.function.arguments.content,
                },
              } as HypothesisToolMessage);

            case 'findRelatedEntities':
              const searchContext = toolCall.function.arguments.context;
              const groupBy = toolCall.function.arguments.groupBy;

              return from(
                writeKeywordSearch({
                  connectorId,
                  context: `The entities will be grouped by the field
                  \`${groupBy}\`.

                  ${searchContext}`,
                  inferenceClient,
                  messages,
                })
                  .then((searches) => {
                    return findRelatedEntitiesViaKeywordSearches({
                      start,
                      end,
                      context: searchContext,
                      searches: searches.values,
                      groupBy,
                      connectorId,
                      esClient,
                      index: logSources,
                      inferenceClient,
                    });
                  })
                  .then((relatedEntitiesSummary) => {
                    const toolMessage: FindRelatedEntitiesViaKeywordSearchesToolMessage = {
                      role: MessageRole.Tool,
                      toolCallId: toolCall.toolCallId,
                      response: {
                        relatedEntitiesSummary,
                      },
                    };

                    return toolMessage;
                  })
              ).pipe(catchToolCallError());

            case 'analyzeEntityHealth':
              const nextEntity = Object.fromEntries(
                toolCall.function.arguments.entity.fields.map(({ field, value }) => [field, value])
              );
              return from(
                analyzeEntityHealth({
                  start,
                  end,
                  entity: nextEntity,
                  alertsClient,
                  connectorId,
                  context: toolCall.function.arguments.context,
                  esClient,
                  inferenceClient,
                  logSources,
                  rulesClient,
                  sloSummaryIndices,
                  spaceId,
                  logger,
                })
              ).pipe(
                switchMap((entityHealthAnalysis) => {
                  if (!entityHealthAnalysis) {
                    const entityNotFoundToolMessage: AnalyzeEntityHealthToolMessage = {
                      role: MessageRole.Tool,
                      response: {
                        instructions: `Entity ${JSON.stringify(nextEntity)} not found, have
                        you verified it exists and if the field and value you are using
                        are correct?`,
                      },
                      toolCallId: toolCall.toolCallId,
                    };
                    return of(entityNotFoundToolMessage);
                  }
                  const { attachments, ...analysisForLlm } = entityHealthAnalysis;
                  const toolMessage: AnalyzeEntityHealthToolMessage = {
                    role: MessageRole.Tool as const,
                    toolCallId: toolCall.toolCallId,
                    response: {
                      instructions: `Use this summary to determine what to do next.
                      You can either summarize this to the user and end your
                      investigation, by using the "concludeAnalysis" tool,
                      or continuing your investigation by calling the "hypothesize"
                      tool.`,
                      analysis: analysisForLlm,
                    },
                    data: {
                      attachments,
                    },
                  };

                  return of(toolMessage);
                }),
                catchToolCallError()
              );
          }
        })
      );
    }
  );

  return next$;
}
