/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseCallbackHandlerInput } from '@langchain/core/callbacks/base';
import type { Run } from 'langsmith/schemas';
import { BaseTracer } from '@langchain/core/tracers/base';
import agent from 'elastic-apm-node';
import type { Logger } from '@kbn/core/server';

export interface LangChainTracerFields extends BaseCallbackHandlerInput {
  exampleId?: string;
  projectName?: string;
}

type Span = Exclude<typeof agent.currentSpan, undefined | null>;

/**
 * APMTracer is a tracer that uses the Elastic APM agent to trace langchain retrievers, llms, chains, and tools.
 */
export class APMTracer extends BaseTracer implements LangChainTracerFields {
  name = 'apm_tracer';
  projectName?: string;
  exampleId?: string;
  logger: Logger;

  retrieverSpans: Span[] = [];
  llmSpans: Span[] = [];
  chainSpans: Span[] = [];
  toolSpans: Span[] = [];

  constructor(fields: LangChainTracerFields = {}, logger: Logger) {
    super(fields);
    const { exampleId, projectName } = fields;

    this.projectName = projectName ?? 'default';
    this.exampleId = exampleId;
    this.logger = logger.get('apmTracer');
  }

  protected async persistRun(_run: Run): Promise<void> {}

  /**
   * LangChain Run's contain a lot of useful information, so here we unpack as much of it as we can
   * into labels that can be added to the corresponding span. Stringifying outputs at the moment since
   * the Run schema is a loose KVMap, but we should more elegantly unpack relevant data that we find useful
   *
   * See BaseRun interface Run extends from
   *
   * @param run
   * @protected
   */
  protected _getLabelsFromRun(run: Run): agent.Labels {
    try {
      return {
        tags: JSON.stringify(run.tags),
        outputs: JSON.stringify(run.outputs),
        events: JSON.stringify(run.events),
        inputs: JSON.stringify(run.inputs),
      };
    } catch (e) {
      this.logger.error(`Error parsing run into labels:\n${e}`);
      return {};
    }
  }

  protected createAndAddSpanFromRun(run: Run, spans: Span[]) {
    const span = agent.startSpan(run.name) ?? undefined;

    if (span) {
      span.addLabels(this._getLabelsFromRun(run));
      spans.push(span);
    }
  }

  async onRetrieverStart(run: Run): Promise<void> {
    this.logger.debug(() => `onRetrieverStart: run:\n${JSON.stringify(run, null, 2)}`);
    this.createAndAddSpanFromRun(run, this.retrieverSpans);
  }

  async onRetrieverEnd(run: Run): Promise<void> {
    this.logger.debug(() => `onRetrieverEnd: run:\n${JSON.stringify(run, null, 2)}`);
    const span = this.retrieverSpans.pop();
    if (span != null) {
      span.addLabels(this._getLabelsFromRun(run));
      span.end();
    }
  }

  async onRetrieverError(run: Run): Promise<void> {
    this.logger.debug(() => `onRetrieverError: run:\n${JSON.stringify(run, null, 2)}`);
  }

  async onLLMStart(run: Run): Promise<void> {
    this.logger.debug(() => `onLLMStart: run:\n${JSON.stringify(run, null, 2)}`);
    this.createAndAddSpanFromRun(run, this.llmSpans);
  }

  async onLLMEnd(run: Run): Promise<void> {
    this.logger.debug(() => `onLLMEnd: run:\n${JSON.stringify(run, null, 2)}`);
    const span = this.llmSpans.pop();
    if (span != null) {
      span.addLabels(this._getLabelsFromRun(run));
      span.end();
    }
  }

  async onLLMError(run: Run): Promise<void> {
    this.logger.debug(() => `onLLMError: run:\n${JSON.stringify(run, null, 2)}`);
  }

  async onChainStart(run: Run): Promise<void> {
    this.logger.debug(() => `onChainStart: run:\n${JSON.stringify(run, null, 2)}`);
    this.createAndAddSpanFromRun(run, this.chainSpans);
  }

  async onChainEnd(run: Run): Promise<void> {
    this.logger.debug(() => `onChainEnd: run:\n${JSON.stringify(run, null, 2)}`);
    const span = this.chainSpans.pop();
    if (span != null) {
      span.addLabels(this._getLabelsFromRun(run));
      span.end();
    }
  }

  async onChainError(run: Run): Promise<void> {
    this.logger.debug(() => `onChainError: run:\n${JSON.stringify(run, null, 2)}`);
  }

  async onToolStart(run: Run): Promise<void> {
    this.logger.debug(() => `onToolStart: run:\n${JSON.stringify(run, null, 2)}`);
    this.createAndAddSpanFromRun(run, this.toolSpans);
  }

  async onToolEnd(run: Run): Promise<void> {
    this.logger.debug(() => `onToolEnd: run:\n${JSON.stringify(run, null, 2)}`);
    const span = this.toolSpans.pop();
    if (span != null) {
      span.addLabels(this._getLabelsFromRun(run));
      span.end();
    }
  }

  async onToolError(run: Run): Promise<void> {
    this.logger.debug(() => `onToolError: run:\n${JSON.stringify(run, null, 2)}`);
  }
}
