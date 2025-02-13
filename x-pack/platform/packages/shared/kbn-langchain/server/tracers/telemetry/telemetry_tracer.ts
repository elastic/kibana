/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseCallbackHandlerInput } from '@langchain/core/callbacks/base';
import type { Run } from 'langsmith/schemas';
import { BaseTracer } from '@langchain/core/tracers/base';
import { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

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
  totalTools: number;
}
interface ToolRunStep {
  action: {
    tool: string;
  };
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
  totalTools: number;
  constructor(fields: LangChainTracerFields, logger: Logger) {
    super(fields);
    this.logger = logger.get('telemetryTracer');
    this.elasticTools = fields.elasticTools;
    this.telemetry = fields.telemetry;
    this.telemetryParams = fields.telemetryParams;
    this.totalTools = fields.totalTools;
  }

  async onChainEnd(run: Run): Promise<void> {
    if (!run.parent_run_id) {
      const { eventType, ...telemetryParams } = this.telemetryParams;
      const toolsInvoked =
        run?.outputs && run?.outputs.steps.length
          ? run.outputs.steps.reduce((acc: { [k: string]: number }, event: ToolRunStep | never) => {
              if ('action' in event && event?.action?.tool) {
                if (this.elasticTools.includes(event.action.tool)) {
                  return {
                    ...acc,
                    ...(event.action.tool in acc
                      ? { [event.action.tool]: acc[event.action.tool] + 1 }
                      : { [event.action.tool]: 1 }),
                  };
                } else {
                  // Custom tool names are user data, so we strip them out
                  return {
                    ...acc,
                    ...('CustomTool' in acc
                      ? { CustomTool: acc.CustomTool + 1 }
                      : { CustomTool: 1 }),
                  };
                }
              }
              return acc;
            }, {})
          : {};
      const telemetryValue = {
        ...telemetryParams,
        durationMs: (run.end_time ?? 0) - (run.start_time ?? 0),
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
