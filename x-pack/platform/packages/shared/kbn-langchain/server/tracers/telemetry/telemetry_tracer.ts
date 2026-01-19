/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseCallbackHandlerInput } from '@langchain/core/callbacks/base';
import type { Run } from 'langsmith/schemas';
import { BaseTracer } from '@langchain/core/tracers/base';
import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { BaseMessage } from '@langchain/core/messages';
import { containsToolCalls } from '../../utils/tools';

export interface TelemetryParams {
  assistantStreamingEnabled: boolean;
  actionTypeId: string;
  isEnabledKnowledgeBase: boolean;
  eventType: string;
  model?: string;
}
export interface LangChainTracerFields extends BaseCallbackHandlerInput {
  elasticTools: string[];
  telemetry: AnalyticsServiceSetup;
  telemetryParams: TelemetryParams;
}

/**
 * TelemetryTracer is a tracer that uses event based telemetry to track LangChain events.
 */
export class TelemetryTracer extends BaseTracer implements LangChainTracerFields {
  name = 'telemetry_tracer';
  logger: Logger;
  elasticTools: string[];
  telemetry: AnalyticsServiceSetup;
  telemetryParams: TelemetryParams;
  constructor(fields: LangChainTracerFields, logger: Logger) {
    super(fields);
    this.logger = logger.get('telemetryTracer');
    this.elasticTools = fields.elasticTools;
    this.telemetry = fields.telemetry;
    this.telemetryParams = fields.telemetryParams;
  }

  async onToolError(run: Run) {
    const eventType = 'invoke_assistant_error';
    const telemetryValue = {
      actionTypeId: this.telemetryParams.actionTypeId,
      model: this.telemetryParams.model,
      errorMessage: run.error,
      assistantStreamingEnabled: this.telemetryParams.assistantStreamingEnabled,
      isEnabledKnowledgeBase: this.telemetryParams.isEnabledKnowledgeBase,
      errorLocation: `executeTools-${run.name}`,
    };

    this.logger.debug(
      () => `Invoke ${eventType} telemetry:\n${JSON.stringify(telemetryValue, null, 2)}`
    );
    this.telemetry.reportEvent(eventType, telemetryValue);
  }

  async onChainEnd(run: Run): Promise<void> {
    if (!run.parent_run_id) {
      const { eventType, ...telemetryParams } = this.telemetryParams;

      const toolsInvoked =
        run?.outputs && run?.outputs.messages.length
          ? run.outputs.messages.reduce((acc: { [k: string]: number }, message: BaseMessage) => {
              if (containsToolCalls(message)) {
                // Calculate counts for each tool call for the message
                const toolCountForMessage = message.tool_calls.reduce(
                  (messageToolUseCount, toolCall) => {
                    const toolName = this.elasticTools.includes(toolCall.name)
                      ? toolCall.name
                      : 'CustomTool';

                    if (!(toolName in messageToolUseCount)) {
                      messageToolUseCount[toolName] = 0;
                    }
                    messageToolUseCount[toolName] += 1;
                    return messageToolUseCount;
                  },
                  {} as Record<string, number>
                );

                // Merge the counts into the accumulator
                Object.entries(toolCountForMessage).forEach(([toolName, count]) => {
                  if (!(toolName in acc)) {
                    acc[toolName] = 0;
                  }
                  acc[toolName] += count;
                });
              }
              return acc;
            }, {})
          : {};
      const telemetryValue = {
        ...telemetryParams,
        durationMs: (Number(run.end_time) || 0) - (Number(run.start_time) || 0),
        toolsInvoked,
        ...(telemetryParams.actionTypeId === '.gen-ai'
          ? { isOssModel: run.inputs.isOssModel }
          : {}),
      };
      this.logger.debug(
        () => `Invoke ${eventType} telemetry:\n${JSON.stringify(telemetryValue, null, 2)}`
      );
      this.telemetry.reportEvent(eventType, telemetryValue);
    }
  }

  // everything below is required for type only
  protected async persistRun(_run: Run): Promise<void> {}
}
