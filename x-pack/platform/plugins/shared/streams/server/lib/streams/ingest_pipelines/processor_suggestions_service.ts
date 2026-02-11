/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsoleStart } from '@kbn/console-plugin/server';
import type { JsonValue } from '@kbn/utility-types';
import type {
  ProcessorSuggestion,
  ProcessorPropertySuggestion,
  ProcessorSuggestionsResponse,
} from '../../../../common';
import { getTemplateFromRule } from '../helpers/template_semantics';

type SpecJsonFetcher = () => ReturnType<ConsoleStart['getSpecJson']>;

const PROCESSOR_ENDPOINT_ID = 'ingest.put_pipeline';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface ProcessorDefinition {
  __template?: JsonValue;
  [key: string]: unknown;
}

type ProcessorEntry = Record<string, ProcessorDefinition>;

function isProcessorEntry(value: unknown): value is ProcessorEntry {
  return (
    isRecord(value) &&
    Object.values(value).every((definition) => definition === undefined || isRecord(definition))
  );
}

function extractProcessorEntries(spec: ReturnType<ConsoleStart['getSpecJson']>): ProcessorEntry[] {
  const endpoints = spec.endpoints;
  if (!isRecord(endpoints)) return [];

  const ingestEndpoint = endpoints[PROCESSOR_ENDPOINT_ID];
  if (!isRecord(ingestEndpoint)) return [];

  const rules = ingestEndpoint.data_autocomplete_rules;
  if (!isRecord(rules)) return [];

  const processorArray = rules.processors;
  if (!Array.isArray(processorArray) || processorArray.length === 0) return [];

  const oneOf = processorArray[0]?.__one_of;
  if (!Array.isArray(oneOf)) return [];

  return oneOf.filter(isProcessorEntry);
}

export class ProcessorSuggestionsService {
  private fetcher: SpecJsonFetcher | undefined;

  constructor() {}

  public setConsoleStart(consoleStart: ConsoleStart) {
    this.fetcher = () => consoleStart.getSpecJson();
  }

  public async getSuggestions(): Promise<ProcessorSuggestion[]> {
    if (!this.fetcher) {
      return [];
    }

    try {
      const spec = this.fetcher();
      return this.buildSuggestions(spec);
    } catch {
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
        const template = def?.__template;
        return { name, template } as ProcessorSuggestion;
      })
      .filter((suggestion): suggestion is ProcessorSuggestion => suggestion !== undefined);
  }

  private buildPropertiesByProcessor(
    spec: ReturnType<ConsoleStart['getSpecJson']>
  ): Record<string, ProcessorPropertySuggestion[]> {
    const processorEntries = extractProcessorEntries(spec);
    const propertiesByProcessorMap: Record<string, ProcessorPropertySuggestion[]> = {};

    for (const entry of processorEntries) {
      const processorName = Object.keys(entry)[0];
      if (!processorName) continue;
      const processorDefinition = entry[processorName];
      if (!processorDefinition || typeof processorDefinition !== 'object') continue;

      const propertySuggestions: ProcessorPropertySuggestion[] = [];
      for (const [propertyName, propertyRule] of Object.entries(processorDefinition)) {
        // Filter out metadata keys like __template, __one_of, __doc, etc.
        if (propertyName.startsWith('__')) continue;
        const rawTemplate = this.extractTemplateFromRule(propertyRule);
        const normalizedTemplate = this.normalizeToJsonValue(rawTemplate as JsonValue | undefined);
        propertySuggestions.push({ name: propertyName, template: normalizedTemplate });
      }
      propertiesByProcessorMap[processorName] = propertySuggestions;
    }

    return propertiesByProcessorMap;
  }

  private extractTemplateFromRule(rule: unknown): unknown {
    return getTemplateFromRule(rule) as JsonValue | undefined;
  }

  private normalizeToJsonValue(template: JsonValue | undefined): JsonValue | undefined {
    if (template === undefined) return undefined;
    if (template === null) return null;

    const t = typeof template;
    if (t === 'string' || t === 'number' || t === 'boolean') return template;
    if (Array.isArray(template)) return template;
    if (isRecord(template)) return template;
    return undefined;
  }

  public async getAllSuggestions(): Promise<ProcessorSuggestionsResponse> {
    if (!this.fetcher) {
      return { processors: [], propertiesByProcessor: {} };
    }

    try {
      const spec = this.fetcher();
      return {
        processors: this.buildSuggestions(spec),
        propertiesByProcessor: this.buildPropertiesByProcessor(spec),
      };
    } catch {
      return { processors: [], propertiesByProcessor: {} };
    }
  }
}
