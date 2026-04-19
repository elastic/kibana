/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

interface RuleTemplateVariableParams {
  fields?: string;
  filters?: string;
}

export interface RuleTemplateVariable {
  type: string;
  input: string;
  params?: RuleTemplateVariableParams;
}

const resolveSingleValue = (
  input: string,
  typeParameters: Record<string, string>,
  resolvedVariables: Record<string, string>
): string => {
  let returnValue = input;
  const variableRegex = /\$\{(\w+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = variableRegex.exec(input)) !== null) {
    const variableName = match[1];
    const variableValue = resolvedVariables[variableName] ?? typeParameters[variableName];

    if (!variableValue) {
      throw new Error(`Unable to resolve variable ${variableName} in input ${input}`);
    }

    returnValue = returnValue.replace(new RegExp(`\\$\\{${variableName}\\}`, 'g'), variableValue);
  }

  return returnValue;
};

const resolveRuleVariables = async (
  typeParameters: Record<string, string>,
  variables: Record<string, RuleTemplateVariable>,
  esClient: ElasticsearchClient
): Promise<Record<string, string>> => {
  const returnValue: Record<string, string> = {};
  const indexPattern = typeParameters.index_pattern ?? '';

  for (const [key, value] of Object.entries(variables ?? {})) {
    if (value.type === 'esql') {
      const queryInput = resolveSingleValue(value.input, typeParameters, returnValue);
      const esqlResult = await esClient.helpers.esql({ query: queryInput }).toRecords();
      returnValue["variables." + key] = JSON.stringify(esqlResult);
      continue;
    }

    if (value.type === 'index') {
      if (!indexPattern) {
        throw new Error(
          `Index pattern must be provided in the type_params for resolving variables of type 'index'`
        );
      }

      if (value.input === '_mapping') {
        const mappingResult = await esClient.indices.getMapping({ index: indexPattern });
        returnValue["variables." + key] = JSON.stringify(mappingResult);
        continue;
      }

      if (value.input === '_settings') {
        const settingsResult = await esClient.indices.getSettings({ index: indexPattern });
        returnValue["variables." + key] = JSON.stringify(settingsResult);
        continue;
      }

      if (value.input === '_field_caps') {
        const fields = value.params?.fields ?? '*';
        const filters = value.params?.filters;

        const fieldCapsResult = await esClient.fieldCaps({
          index: indexPattern,
          fields,
          ...(filters ? { filters } : {}),
        });

        returnValue["variables." + key] = JSON.stringify(fieldCapsResult);
        continue;
      }

      throw new Error(`Unsupported input ${value.input} for variable of type 'index'`);
    }

    if (value.type === 'value') {
      returnValue["variables." + key] = resolveSingleValue(value.input, typeParameters, returnValue);
    }
  }

  return returnValue;
};

export const processRuleTemplateVariables = async (
  template: string,
  typeParameters: Record<string, string>,
  variables: Record<string, RuleTemplateVariable>,
  esClient: ElasticsearchClient
): Promise<string> => {
  const resolvedVariables = await resolveRuleVariables(typeParameters, variables, esClient);

  let processedTemplate = template;
  for (const [key, value] of Object.entries(resolvedVariables)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    if (!processedTemplate.match(regex)) {
      throw new Error(`Variable ${key} not found in template`);
    }
    processedTemplate = processedTemplate.replace(regex, value);
  }

  // and any type_parameters that weren't used as variables
  for (const [key, value] of Object.entries(typeParameters)) {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    if (processedTemplate.match(regex)) {
      processedTemplate = processedTemplate.replace(regex, value);
    }
  }

  const remainingVariableRegex = /\$\{(\w+)\}/g;
  const remainingVariables = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = remainingVariableRegex.exec(processedTemplate)) !== null) {
    remainingVariables.add(match[1]);
  }

  if (remainingVariables.size > 0) {
    throw new Error(
      `The following variables were not resolved in the template: ${Array.from(
        remainingVariables
      ).join(', ')}`
    );
  }

  return processedTemplate;
};
