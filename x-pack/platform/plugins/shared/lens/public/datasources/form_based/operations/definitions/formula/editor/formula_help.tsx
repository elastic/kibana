/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Markdown } from '@kbn/shared-ux-markdown';
import {
  documentationMap,
  tinymathFunctions,
  sections as formulasSections,
} from '@kbn/lens-formula-docs';
import { groupBy } from 'lodash';
import type { IndexPattern } from '../../../../../../types';
import { getPossibleFunctions } from './math_completion';
import { hasFunctionFieldArgument } from '../validation';

import type {
  GenericOperationDefinition,
  GenericIndexPatternColumn,
  OperationDefinition,
  ParamEditorProps,
} from '../..';
import type { FormulaIndexPatternColumn } from '../formula';

function createNewSection(
  label: string,
  description: string,
  functionsToDocument: string[],
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  return {
    label,
    description,
    items: functionsToDocument.sort().map((key) => {
      const fnDescription = getFunctionDescriptionAndExamples(key);
      return {
        label: key,
        description: (
          <>
            <h3>{getFunctionSignatureLabel(key, operationDefinitionMap, false)}</h3>

            {fnDescription ? <Markdown readOnly>{fnDescription}</Markdown> : null}
          </>
        ),
      };
    }),
  };
}

function getFunctionDescriptionAndExamples(label: string) {
  if (tinymathFunctions[label]) {
    const [description, examples] = tinymathFunctions[label].help.split(`\`\`\``);
    return `${description.replace(/\n/g, '\n\n')}${examples ? `\`\`\`${examples}\`\`\`` : ''}`;
  }
  return documentationMap[label].documentation?.description;
}

export function getDocumentationSections({
  indexPattern,
  operationDefinitionMap,
}: {
  indexPattern: IndexPattern;
  operationDefinitionMap: Record<string, GenericOperationDefinition>;
}) {
  const helpGroups: Array<{
    label: string;
    description?: string;
    items: Array<{ label: string; description?: JSX.Element }>;
  }> = [];

  helpGroups.push({
    label: i18n.translate('xpack.lens.formulaDocumentationHeading', {
      defaultMessage: 'How it works',
    }),
    items: [],
  });

  helpGroups.push({
    label: formulasSections.common.label,
    description: formulasSections.common.description,
    items: formulasSections.common.items.map(
      ({ label, description }: { label: string; description: string }) => ({
        label,
        description: <Markdown readOnly>{description}</Markdown>,
      })
    ),
  });

  const {
    elasticsearch: esFunctions,
    calculation: calculationFunctions,
    math: mathOperations,
    comparison: comparisonOperations,
    constants: constantsOperations,
  } = groupBy(getPossibleFunctions(indexPattern), (key) => {
    if (key in operationDefinitionMap) {
      return documentationMap[key].documentation?.section;
    }
    if (key in tinymathFunctions) {
      return tinymathFunctions[key].section;
    }
  });

  // Es aggs
  helpGroups.push(
    createNewSection(
      formulasSections.elasticsearch.label,
      formulasSections.elasticsearch.description,
      esFunctions,
      operationDefinitionMap
    )
  );

  // Calculations aggs
  helpGroups.push(
    createNewSection(
      formulasSections.calculations.label,
      formulasSections.calculations.description,
      calculationFunctions,
      operationDefinitionMap
    )
  );

  helpGroups.push(
    createNewSection(
      formulasSections.math.label,
      formulasSections.math.description,
      mathOperations,
      operationDefinitionMap
    )
  );

  helpGroups.push(
    createNewSection(
      formulasSections.comparison.label,
      formulasSections.comparison.description,
      comparisonOperations,
      operationDefinitionMap
    )
  );

  helpGroups.push(
    createNewSection(
      formulasSections.context.label,
      formulasSections.context.description,
      constantsOperations,
      operationDefinitionMap
    )
  );

  const sections = {
    groups: helpGroups,
    initialSection: <Markdown readOnly>{formulasSections.howTo}</Markdown>,
  };

  return sections;
}

export function getFunctionSignatureLabel(
  name: string,
  operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap'],
  getFullSignature: boolean = true
): string {
  if (tinymathFunctions[name]) {
    return `${name}(${tinymathFunctions[name].positionalArguments
      .map(({ name: argName, optional, type }) => `[${argName}]${optional ? '?' : ''}: ${type}`)
      .join(', ')})`;
  }
  if (operationDefinitionMap[name]) {
    const def = operationDefinitionMap[name];
    const extraArgs: string[] = [];
    if (getFullSignature) {
      if (def.filterable) {
        extraArgs.push(
          i18n.translate('xpack.lens.formula.kqlExtraArguments', {
            defaultMessage: '[kql]?: string, [lucene]?: string',
          })
        );
      }
      if (def.shiftable) {
        extraArgs.push(
          i18n.translate('xpack.lens.formula.shiftExtraArguments', {
            defaultMessage: '[shift]?: string',
          })
        );
      }
      if (def.canReduceTimeRange) {
        extraArgs.push(
          i18n.translate('xpack.lens.formula.reducedTimeRangeExtraArguments', {
            defaultMessage: '[reducedTimeRange]?: string',
          })
        );
      }
    }
    const extraComma = extraArgs.length ? ', ' : '';
    return `${name}(${documentationMap[name].documentation?.signature}${extraComma}${extraArgs.join(
      ', '
    )})`;
  }
  return '';
}

function getFunctionArgumentsStringified(
  params: Required<
    OperationDefinition<GenericIndexPatternColumn, 'field' | 'fullReference'>
  >['operationParams']
) {
  return params
    .map(
      ({ name, type: argType, defaultValue = 5 }) =>
        `${name}=${argType === 'string' ? `"${defaultValue}"` : defaultValue}`
    )
    .join(', ');
}

/**
 * Get an array of strings containing all possible information about a specific
 * operation type: examples and infos.
 */
export function getHelpTextContent(
  type: string,
  operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap']
): { description: string; examples: string[] } {
  const definition = operationDefinitionMap[type];
  const description = documentationMap[type].documentation?.description ?? '';

  // as for the time being just add examples text.
  // Later will enrich with more information taken from the operation definitions.
  const examples: string[] = [];
  // If the description already contain examples skip it
  if (!/Example/.test(description)) {
    if (!hasFunctionFieldArgument(type)) {
      // ideally this should have the same example automation as the operations below
      examples.push(`${type}()`);
      return { description, examples };
    }
    if (definition.input === 'field') {
      const mandatoryArgs = definition.operationParams?.filter(({ required }) => required) || [];
      if (mandatoryArgs.length === 0) {
        examples.push(`${type}(bytes)`);
      }
      if (mandatoryArgs.length) {
        const additionalArgs = getFunctionArgumentsStringified(mandatoryArgs);
        examples.push(`${type}(bytes, ${additionalArgs})`);
      }
      if (
        definition.operationParams &&
        mandatoryArgs.length !== definition.operationParams.length
      ) {
        const additionalArgs = getFunctionArgumentsStringified(definition.operationParams);
        examples.push(`${type}(bytes, ${additionalArgs})`);
      }
    }
    if (definition.input === 'fullReference') {
      const mandatoryArgs = definition.operationParams?.filter(({ required }) => required) || [];
      if (mandatoryArgs.length === 0) {
        examples.push(`${type}(sum(bytes))`);
      }
      if (mandatoryArgs.length) {
        const additionalArgs = getFunctionArgumentsStringified(mandatoryArgs);
        examples.push(`${type}(sum(bytes), ${additionalArgs})`);
      }
      if (
        definition.operationParams &&
        mandatoryArgs.length !== definition.operationParams.length
      ) {
        const additionalArgs = getFunctionArgumentsStringified(definition.operationParams);
        examples.push(`${type}(sum(bytes), ${additionalArgs})`);
      }
    }
  }
  return { description, examples };
}
