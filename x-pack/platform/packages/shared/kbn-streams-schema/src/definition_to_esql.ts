/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, conditionToESQL, getConditionFields, getRegularEcsField } from '..';
import {
  DateProcessorDefinition,
  GrokProcessorDefinition,
  ProcessorDefinition,
  RenameProcessorDefinition,
  SetProcessorDefinition,
  isGrokProcessorDefinition,
} from './models/ingest/processors';

export function definitionToESQLQuery(
  definition: Streams.WiredStream.GetResponse,
  parent?: Streams.WiredStream.GetResponse,
  { includeSource }: { includeSource?: boolean } = {}
): string | undefined {
  if (!parent) {
    // If we don't have a parent, we can't construct the ESQL query
    return undefined;
  }

  // This is a draft stream, which means we need to construct it as ESQL.
  // * Field mappings on this level need to go into INSIST_🐔 calls
  // * Processing steps need to be converted to ESQL syntax
  // * The routing condition of the parent needs to be turned into a WHERE clause
  const { stream } = definition;
  const { ingest } = stream;
  const { wired } = ingest;
  const inheritedFields = Object.keys(definition.inherited_fields) ?? [];
  const mappedFields = new Set<string>(Object.keys(wired.fields));

  const routingCondition = parent.stream.ingest.wired.routing.find(
    (r) => r.destination === definition.stream.name
  )!.if;

  const processorHandlers = [
    {
      check: isGrokProcessorDefinition,
      toStep: (step: ProcessorDefinition) => {
        const { field, patterns } = (step as GrokProcessorDefinition).grok;
        const pattern = patterns[0];
        // turn \ into a double backslash for ESQL
        const escapedPattern = pattern.replace(/\\/g, '\\\\');
        return `GROK ${field} "${escapedPattern}"`;
      },
      getInFields: (step: ProcessorDefinition) => [(step as GrokProcessorDefinition).grok.field],
      getOutFields: (step: ProcessorDefinition) => {
        // analyze the first pattern to extract the field names
        const { patterns } = (step as GrokProcessorDefinition).grok;
        const pattern = patterns[0];
        const fieldNames = new Set<string>();
        const regex = /%{(\w+):([\w.]+)}/g;
        let match;
        while ((match = regex.exec(pattern)) !== null) {
          fieldNames.add(match[2]); // match[2] is the target field name
        }
        return Array.from(fieldNames);
      },
    },
    {
      check: (step: ProcessorDefinition) => 'rename' in step,
      toStep: (step: RenameProcessorDefinition) =>
        `RENAME ${step.rename.field} AS ${step.rename.target_field}`,
      getInFields: (step: RenameProcessorDefinition) => [step.rename.field],
      getOutFields: (step: RenameProcessorDefinition) => [step.rename.target_field],
    },
    {
      check: (step: ProcessorDefinition) => 'set' in step,
      toStep: (step: SetProcessorDefinition) => {
        const { field, value } = step.set;
        return `EVAL ${field} = ${typeof value === 'string' ? `"${value}"` : value}`;
      },
      getInFields: () => [],
      getOutFields: (step: SetProcessorDefinition) => [step.set.field],
    },
    {
      check: (step: ProcessorDefinition) => 'date' in step,
      toStep: (step: DateProcessorDefinition) =>
        `EVAL ${step.date.target_field ?? step.date.field} = DATE_PARSE("${
          step.date.formats[0]
        }", ${step.date.field})`,
      getInFields: (step: DateProcessorDefinition) => [step.date.field],
      getOutFields: (step: DateProcessorDefinition) => [step.date.target_field ?? step.date.field],
    },
  ];

  const inFields = new Set<string>();
  const outFields = new Set<string>();

  getConditionFields(routingCondition).forEach((field) => inFields.add(field.name));
  ingest.processing.forEach((step) => {
    const handler = processorHandlers.find((h) => h.check(step));
    if (handler) {
      handler.getInFields(step as any).forEach((field) => inFields.add(field));
      handler.getOutFields(step as any).forEach((field) => outFields.add(field));
    }
  });

  const insistCalls = Array.from([...inFields, ...mappedFields])
    // Filter out fields that are inherited
    .filter((fieldName) => !inheritedFields.includes(fieldName))
    .map((fieldName) => `INSIST_🐔 ${fieldName}`)
    .join(' | ');

  const mappingsArray = Array.from([...inFields, ...mappedFields])
    // Filter out fields that are inherited
    .filter((fieldName) => !inheritedFields.includes(fieldName))
    .flatMap((fieldName) => {
      // TODO - this only works for keyword - oh well. leave for now, since we are blocked by Elasticsearch here
      return [`EVAL ${fieldName} = COALESCE(${fieldName}, "")`];
    });

  const mappings = mappingsArray.join(' | ');

  // Refactored processing logic
  const steps: string[] = [];
  ingest.processing.forEach((step) => {
    const handler = processorHandlers.find((h) => h.check(step));
    if (!handler) return;
    steps.push(handler.toStep(step as any));
  });

  const allOutFields = new Set<string>([...outFields, ...mappedFields]);

  const aliasEvals = Array.from(allOutFields).flatMap((field) => {
    const alias = getRegularEcsField(field);
    if (!alias) return [];
    if (mappedFields.has(field) || inheritedFields.includes(field)) {
      return [`EVAL ${alias} = ${field}`];
    }
    return [];
  });

  const processingSteps = [...steps, ...aliasEvals].join(' | ');
  // TODO - if there are other draft streams in the routing list of the parent before this one, we need to include their mappings as well and then negate the routing condition to avoid doublematches
  const routingConditionClause = `WHERE ${conditionToESQL(routingCondition)}`;

  // TODO: Handle the case where the parent is a draft stream too - in this case we would need to
  //      include the parent stream's mappings and processing steps as well and start from the parent of the parent and so on.

  return [
    `FROM ${parent.stream.name} ${includeSource ? ' METADATA _source' : ''}`,
    insistCalls,
    mappings,
    routingConditionClause,
    processingSteps,
  ]
    .filter(Boolean)
    .join(' | ');
}
