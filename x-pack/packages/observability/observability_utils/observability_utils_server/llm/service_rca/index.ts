/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isChatCompletionMessageEvent,
  isOutputCompleteEvent,
  MessageRole,
} from '@kbn/inference-plugin/common';
import {
  AssistantMessage,
  AssistantMessageOf,
  ToolMessage,
  UserMessage,
} from '@kbn/inference-plugin/common/chat_complete';
import {
  ToolCallsOf,
  ToolChoice,
  ToolChoiceType,
} from '@kbn/inference-plugin/common/chat_complete/tools';
import { compact, findLast, omit, pick, uniqueId } from 'lodash';
import {
  catchError,
  filter,
  from,
  ignoreElements,
  map,
  merge,
  Observable,
  of,
  OperatorFunction,
  share,
  switchMap,
  tap,
} from 'rxjs';
import { callTools } from '../call_tools';
import { generateSignificantEventsTimeline, SignificantEventsTimeline } from './generate_timeline';
import {
  EntityInvestigation,
  EntityInvestigationParameters,
  investigateEntity,
} from './investigate_entity';
import { ObservationStepSummary, observe } from './observe';
import {
  RCA_SYSTEM_PROMPT_BASE,
  SYSTEM_PROMPT_CHANGES,
  SYSTEM_PROMPT_ENTITIES,
} from './system_prompt_base';
import { writeRcaReport } from './write_rca_report';
import { formatEntity } from './format_entity';

const OBSERVE_TOOL_NAME = 'observe';
const END_PROCESS_TOOL_NAME = 'endProcessAndWriteReport';
const INVESTIGATE_ENTITY_TOOL_NAME = 'investigateEntity';

const SYSTEM_PROMPT_WITH_OBSERVE_INSTRUCTIONS = `${RCA_SYSTEM_PROMPT_BASE}

Your next step is to request an observation from another agent based
on the initial context or the results of previous investigations.`;

const SYSTEM_PROMPT_WITH_DECISION_INSTRUCTIONS = `${RCA_SYSTEM_PROMPT_BASE}

${SYSTEM_PROMPT_ENTITIES}

${SYSTEM_PROMPT_CHANGES}

  To determine whether to end the process or continue analyzing another entity,
follow these principles:

  Continuing the process:
  - There are still unexplained symptoms (e.g. elevated error rates or
connection issues), but you haven't yet uncovered a clear root cause,
 continue investigating entities. Focus on investigating entities that could be
causing or be affected by the incident.
  - Do not investigate an entity twice. This will result in a failure.
  - Logs, traces, or observability data that suggest upstream or downstream
issues (such as connection failures, timeouts, or authentication errors)
indicate further investigation is required.
  Follow these breadcrumbs to investigate related services, hosts, or
containers.
  
  Ending the process:
  - Probable root cause identified: If a change or action (such as a recent
deployment, configuration modification, or version update) has been pinpointed
as the likely cause of the incident, you can end the process. The identified
root cause must be related to an observable system change, such as a version
mismatch or a configuration drift, rather than just an external symptom.
  - No further entities to investigate: If there are no unexplored upstream or
downstream dependencies, and all related entities have been investigated without
discovering new anomalies, it may be appropriate to end the process.
  - If all investigated entities (e.g., services, hosts, containers) are
functioning normally, with no relevant issues found, and there are no signs of
dependencies being affected, you may consider ending the process.
  - Avoid concluding the investigation based solely on symptoms or the absence
of immediate errors in the data. Unless a system change has been connected to
the incident, it is important to continue investigating dependencies to ensure
the root cause has been accurately identified.`;

const EMPTY_ASSISTANT_MESSAGE: Extract<RootCauseAnalysisForServiceEvent, AssistantMessage> = {
  content: '',
  role: MessageRole.Assistant,
  toolCalls: [],
};

const tools = {
  [OBSERVE_TOOL_NAME]: {
    description: `Request an observation from another agent on
    the results of the returned investigations`,
    schema: {
      type: 'object',
      properties: {
        observe: {
          type: 'boolean',
        },
      },
      required: ['observe'],
    },
  },
  [END_PROCESS_TOOL_NAME]: {
    description: `End the RCA process by requesting a
    written report from another agent`,
    schema: {
      type: 'object',
      properties: {
        endProcess: {
          type: 'boolean',
        },
      },
      required: ['endProcess'],
    },
  },
  [INVESTIGATE_ENTITY_TOOL_NAME]: {
    description: `Investigate an entity`,
    schema: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          description:
            'Context for investigating this entity. Mention the kind of change you are looking for.',
        },
        entity: {
          type: 'object',
          description: `The entity you want to investigate, such as a service. Use
          the Elasticsearch field names and values. For example, for services, use
          the following structure: ${JSON.stringify({
            entity: { field: 'service.name', value: 'opbeans-java' },
          })}`,
          properties: {
            field: {
              type: 'string',
            },
            value: {
              type: 'string',
            },
          },
          required: ['field', 'value'],
        },
      },
      required: ['context', 'entity'],
    },
  },
} as const;

export type ToolErrorMessage = ToolMessage<
  'error',
  {
    error: {
      message: string;
    };
  }
>;

type EndProcessToolMessage = ToolMessage<
  typeof END_PROCESS_TOOL_NAME,
  {
    report: string;
    timeline: SignificantEventsTimeline;
  }
>;

type ObservationToolMessage = ToolMessage<
  typeof OBSERVE_TOOL_NAME,
  {
    content: string;
  }
> & {
  data: ObservationStepSummary;
};

type InvestigateEntityToolMessage = ToolMessage<
  typeof INVESTIGATE_ENTITY_TOOL_NAME,
  Pick<EntityInvestigation, 'entity' | 'summary' | 'relationships'>
> & {
  data: { attachments: EntityInvestigation['attachments'] };
};

export type RootCauseAnalysisForServiceEvent =
  | RootCauseAnalysisToolMessage
  | ToolErrorMessage
  | UserMessage
  | AssistantMessageOf<{ tools: typeof tools; toolChoice?: ToolChoice<keyof typeof tools> }>;

export type RootCauseAnalysisToolRequest = ToolCallsOf<{
  tools: typeof tools;
}>['toolCalls'][number];

export type RootCauseAnalysisToolMessage =
  | EndProcessToolMessage
  | InvestigateEntityToolMessage
  | ObservationToolMessage;

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
  context: initialContext,
  logger: incomingLogger,
}: Omit<EntityInvestigationParameters, 'entity'> & {
  context: string;
  serviceName: string;
}): Observable<RootCauseAnalysisForServiceEvent> {
  const logger = incomingLogger.get('rca');

  const inferenceClientLogger = logger.get('inference');

  const entity = { 'service.name': serviceName };

  const investigationTimeRangePrompt = `## Time range
  
    The time range of the investigation is ${new Date(start).toISOString()} until ${new Date(
    end
  ).toISOString()}`;

  initialContext = `${initialContext}

  ${investigationTimeRangePrompt}
  `;

  const initialMessage = {
    role: MessageRole.User as const,
    content: `Investigate the health status of ${formatEntity(entity)}.
    
    The context given for this investigation is:

    ${initialContext}`,
  };

  const originalOutput = inferenceClient.output.bind(inferenceClient);

  inferenceClient.output = (...args) => {
    const next$ = originalOutput(...args).pipe(share());
    const requestId = uniqueId('inferenceClient.output-');
    const id = `${requestId}/${args[0]}`;
    inferenceClientLogger.debug(() => `Output (${id}) request: ${JSON.stringify(args[1])}`);
    return merge(
      next$,
      next$.pipe(
        tap((event) => {
          if (isOutputCompleteEvent(event)) {
            inferenceClientLogger.debug(() => `Output (${id}) response: ${JSON.stringify(event)}`);
          }
        }),
        ignoreElements()
      )
    );
  };

  const originalChatComplete = inferenceClient.chatComplete.bind(inferenceClient);

  inferenceClient.chatComplete = (request) => {
    const next$ = originalChatComplete(request).pipe(share());
    const requestId = uniqueId('inferenceClient.chatComplete');
    const id = `${requestId}`;
    const messagesWithoutData = request.messages.map((msg) => omit(msg, 'data'));
    inferenceClientLogger.debug(
      () =>
        `chatComplete (${id}) request: ${JSON.stringify({
          ...request,
          messages: messagesWithoutData,
        })}`
    );
    return merge(
      next$,
      next$.pipe(
        tap((event) => {
          if (isChatCompletionMessageEvent(event)) {
            inferenceClientLogger.debug(
              () => `chatComplete (${id}) response: ${JSON.stringify(event)}`
            );
          }
        }),
        ignoreElements()
      )
    );
  };

  const next$ = callTools(
    {
      system: RCA_SYSTEM_PROMPT_BASE,
      connectorId,
      inferenceClient,
      messages: [initialMessage],
      logger,
    },
    ({ messages }) => {
      const lastSuccessfulToolResponse = findLast(
        messages,
        (message) => message.role === MessageRole.Tool && message.name !== 'error'
      ) as Exclude<ToolMessage, ToolErrorMessage> | undefined;

      const shouldWriteObservationNext =
        !lastSuccessfulToolResponse || lastSuccessfulToolResponse.name !== OBSERVE_TOOL_NAME;

      const nextTools = shouldWriteObservationNext
        ? pick(tools, OBSERVE_TOOL_NAME)
        : pick(tools, END_PROCESS_TOOL_NAME, INVESTIGATE_ENTITY_TOOL_NAME);

      const nextSystem = shouldWriteObservationNext
        ? SYSTEM_PROMPT_WITH_OBSERVE_INSTRUCTIONS
        : SYSTEM_PROMPT_WITH_DECISION_INSTRUCTIONS;

      return {
        messages,
        system: `${nextSystem}

        ${investigationTimeRangePrompt}`,
        tools: nextTools,
        toolChoice: shouldWriteObservationNext
          ? { function: OBSERVE_TOOL_NAME }
          : ToolChoiceType.required,
      };
    },
    ({
      toolCalls,
      messages,
    }): Observable<
      | ObservationToolMessage
      | ToolErrorMessage
      | InvestigateEntityToolMessage
      | EndProcessToolMessage
      | AssistantMessage
    > => {
      const observationMessages = messages.filter((message) => {
        return message.role === MessageRole.Tool && message.name === OBSERVE_TOOL_NAME;
      }) as ObservationToolMessage[];

      const summaries = observationMessages.map((message) => message.data);

      const withToolResponses$ = merge(
        ...toolCalls.map((toolCall) => {
          function catchToolCallError<T>(): OperatorFunction<T, T | ToolErrorMessage> {
            return catchError((error) => {
              logger.error(`Failed executing task: ${error.message}`);
              logger.error(error);
              const toolErrorMessage: ToolErrorMessage = {
                name: 'error',
                role: MessageRole.Tool,
                response: {
                  error: {
                    ...('toJSON' in error && typeof error.toJSON === 'function'
                      ? error.toJSON()
                      : {}),
                    message: error.message,
                  },
                },
                toolCallId: toolCall.toolCallId,
              };
              return of(toolErrorMessage);
            });
          }

          const { name } = toolCall.function;

          switch (name) {
            case OBSERVE_TOOL_NAME:
              const lastAssistantMessage = findLast(
                messages.slice(0, -1),
                (message) => message.role === MessageRole.Assistant
              );

              const toolMessagesByToolCallId = Object.fromEntries(
                compact(
                  messages.map((message) =>
                    'toolCallId' in message && message.name === INVESTIGATE_ENTITY_TOOL_NAME
                      ? [message.toolCallId, message as InvestigateEntityToolMessage]
                      : undefined
                  )
                )
              );

              const investigationToolMessages =
                lastAssistantMessage && lastAssistantMessage.toolCalls
                  ? compact(
                      lastAssistantMessage.toolCalls.map(
                        ({ toolCallId }) => toolMessagesByToolCallId[toolCallId]
                      )
                    )
                  : [];

              const investigations = investigationToolMessages.map(
                ({ response: { entity: investigatedEntity, relationships, summary }, data }) => {
                  return {
                    entity: investigatedEntity,
                    relationships,
                    summary,
                    attachments: data.attachments,
                  };
                }
              );

              return from(
                observe({
                  connectorId,
                  inferenceClient,
                  summaries,
                  investigations,
                  initialContext,
                  logger,
                }).then((summary) => {
                  const observationToolMessage: ObservationToolMessage = {
                    name: OBSERVE_TOOL_NAME,
                    response: {
                      content: summary.content,
                    },
                    data: summary,
                    role: MessageRole.Tool,
                    toolCallId: toolCall.toolCallId,
                  };
                  return observationToolMessage;
                })
              ).pipe(
                switchMap((toolMessage) => {
                  return of(toolMessage);
                })
              );

            case INVESTIGATE_ENTITY_TOOL_NAME:
              const nextEntity = {
                [toolCall.function.arguments.entity.field]:
                  toolCall.function.arguments.entity.value,
              };

              return from(
                investigateEntity({
                  start,
                  end,
                  entity: nextEntity,
                  alertsClient,
                  connectorId,
                  esClient,
                  inferenceClient,
                  logSources,
                  rulesClient,
                  sloSummaryIndices,
                  spaceId,
                  logger,
                  summaries,
                  context: toolCall.function.arguments.context,
                })
              ).pipe(
                switchMap((entityInvestigation) => {
                  if (!entityInvestigation) {
                    const entityNotFoundToolMessage: ToolErrorMessage = {
                      name: 'error',
                      role: MessageRole.Tool,
                      response: {
                        error: {
                          message: `Entity ${JSON.stringify(nextEntity)} not found, have
                        you verified it exists and if the field and value you are using
                        are correct?`,
                        },
                      },
                      toolCallId: toolCall.toolCallId,
                    };
                    return of(entityNotFoundToolMessage);
                  }
                  const {
                    attachments,
                    relationships,
                    entity: investigatedEntity,
                    summary,
                  } = entityInvestigation;
                  const toolMessage: InvestigateEntityToolMessage = {
                    name: INVESTIGATE_ENTITY_TOOL_NAME,
                    role: MessageRole.Tool as const,
                    toolCallId: toolCall.toolCallId,
                    response: {
                      entity: investigatedEntity,
                      relationships,
                      summary,
                    },
                    data: {
                      attachments,
                    },
                  };

                  return of(toolMessage);
                }),
                catchToolCallError()
              );

            case END_PROCESS_TOOL_NAME:
              return from(
                writeRcaReport({
                  summaries,
                  inferenceClient,
                  connectorId,
                }).then(async (report) => {
                  return {
                    report,
                    timeline: await generateSignificantEventsTimeline({
                      inferenceClient,
                      connectorId,
                      report,
                      summaries,
                    }),
                  };
                })
              ).pipe(
                switchMap(({ report, timeline }) => {
                  const toolMessage: EndProcessToolMessage = {
                    name: END_PROCESS_TOOL_NAME,
                    role: MessageRole.Tool,
                    toolCallId: toolCall.toolCallId,
                    response: {
                      report,
                      timeline,
                    },
                  };

                  return of(toolMessage, EMPTY_ASSISTANT_MESSAGE);
                }),
                catchToolCallError()
              );
          }
        })
      );

      return withToolResponses$;
    }
  );

  return next$.pipe(
    filter((event) =>
      Boolean(event.role !== MessageRole.Assistant || event.content || event.toolCalls?.length)
    ),
    map((event) => {
      if (event.role === MessageRole.Assistant) {
        return event as Extract<RootCauseAnalysisForServiceEvent, AssistantMessage>;
      }
      return event;
    })
  );
}
