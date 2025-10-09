/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConsoleStart } from '@kbn/console-plugin/server';
import type { ProcessorSuggestion } from '@kbn/streams-plugin/common';

type SpecJsonFetcher = () => ReturnType<ConsoleStart['getSpecJson']>;

const PROCESSOR_ENDPOINT_ID = 'ingest.put_pipeline';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface ProcessorDefinition {
  __template?: unknown;
}

interface ProcessorEntry {
  [name: string]: ProcessorDefinition;
}

function isProcessorEntry(value: unknown): value is ProcessorEntry {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (definition) => definition === undefined || isRecord(definition)
    )
  );
}

function extractProcessorEntries(
  spec: ReturnType<ConsoleStart['getSpecJson']>
): ProcessorEntry[] {
  const endpoints = spec.endpoints;
  if (!isRecord(endpoints)) {
    return [];
  }

  const ingestEndpoint = endpoints[PROCESSOR_ENDPOINT_ID];
  if (!isRecord(ingestEndpoint)) {
    return [];
  }

  const rules = (ingestEndpoint as { data_autocomplete_rules?: unknown }).data_autocomplete_rules;
  if (!isRecord(rules)) {
    return [];
  }

  const processors = (rules as { processors?: unknown }).processors;
  if (!Array.isArray(processors) || processors.length === 0) {
    return [];
  }

  const entries = processors[0]?.__one_of;
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.filter(isProcessorEntry);
}

export class ProcessorSuggestionsService {
  private readonly logger: Logger;
  private fetcher: SpecJsonFetcher | undefined;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  public setConsoleStart(consoleStart: ConsoleStart) {
    this.fetcher = () => consoleStart.getSpecJson();
  }

  public async getSuggestions(): Promise<ProcessorSuggestion[]> {
    if (!this.fetcher) {
      this.logger.debug('Console spec fetcher not available; returning empty processor suggestions');
      return [];
    }

    try {
      const spec = this.fetcher();
      return this.buildSuggestions(spec);
    } catch (error) {
      this.logger.warn(
        `Failed to retrieve ingest processor suggestions from Console spec: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  private buildSuggestions(spec: ReturnType<ConsoleStart['getSpecJson']>): ProcessorSuggestion[] {
    const entries = extractProcessorEntries(spec);

    return entries
      .map((entry) => {
        const name = Object.keys(entry)[0];
        if (!name) {
          return undefined;
        }
        const def = entry[name];
        const template = def?.__template as ProcessorSuggestion['template'];
        return { name, template } as ProcessorSuggestion;
      })
      .filter((suggestion): suggestion is ProcessorSuggestion => suggestion !== undefined)
  }
}
