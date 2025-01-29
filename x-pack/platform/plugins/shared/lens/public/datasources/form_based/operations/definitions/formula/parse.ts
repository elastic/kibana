/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isObject } from 'lodash';
import type { TinymathAST, TinymathVariable, TinymathLocation } from '@kbn/tinymath';
import { nonNullable } from '../../../../../utils';
import type { DateRange } from '../../../../../../common/types';
import type { IndexPattern } from '../../../../../types';
import {
  OperationDefinition,
  GenericOperationDefinition,
  GenericIndexPatternColumn,
  operationDefinitionMap,
} from '..';
import type { FormBasedLayer } from '../../../types';
import { mathOperation } from './math';
import { documentField } from '../../../document_field';
import { runASTValidation, shouldHaveFieldArgument, tryToParse } from './validation';
import {
  filterByVisibleOperation,
  findVariables,
  getOperationParams,
  groupArgsByType,
  mergeWithGlobalFilters,
} from './util';
import { FormulaIndexPatternColumn, isFormulaIndexPatternColumn } from './formula';
import { getColumnOrder } from '../../layer_helpers';

/** @internal **/
export function getManagedId(mainId: string, index: number) {
  return `${mainId}X${index}`;
}

function parseAndExtract(
  text: string,
  layer: FormBasedLayer,
  columnId: string,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>,
  dateRange: DateRange | undefined,
  label?: string
) {
  const parseResponse = tryToParse(text, operations);
  if ('error' in parseResponse) {
    return { extracted: [], isValid: false };
  }
  // before extracting the data run the validation task and throw if invalid
  const errors = runASTValidation(
    parseResponse.root,
    layer,
    indexPattern,
    operations,
    layer.columns[columnId],
    dateRange
  );
  if (errors.length) {
    return { extracted: [], isValid: false };
  }
  /*
    { name: 'add', args: [ { name: 'abc', args: [5] }, 5 ] }
    */
  const extracted = extractColumns(
    columnId,
    operations,
    parseResponse.root,
    layer,
    indexPattern,
    i18n.translate('xpack.lens.indexPattern.formulaPartLabel', {
      defaultMessage: 'Part of {label}',
      values: { label: label || text },
    }),
    dateRange
  );
  return { extracted, isValid: true };
}

function extractColumns(
  idPrefix: string,
  operations: Record<string, GenericOperationDefinition>,
  ast: TinymathAST,
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  label: string,
  dateRange: DateRange | undefined
): Array<{ column: GenericIndexPatternColumn; location?: TinymathLocation }> {
  const columns: Array<{ column: GenericIndexPatternColumn; location?: TinymathLocation }> = [];
  const { filter: globalFilter, reducedTimeRange: globalReducedTimeRange } =
    layer.columns[idPrefix];

  function parseNode(node: TinymathAST) {
    if (typeof node === 'number' || node.type !== 'function') {
      // leaf node
      return node;
    }

    const nodeOperation = operations[node.name];
    if (!nodeOperation) {
      // it's a regular math node
      const consumedArgs = node.args.map(parseNode).filter(nonNullable) as Array<
        number | TinymathVariable
      >;
      return {
        ...node,
        args: consumedArgs,
      };
    }

    // split the args into types for better TS experience
    const { namedArguments, variables, functions } = groupArgsByType(node.args);

    // operation node
    if (nodeOperation.input === 'field') {
      const [fieldName] = variables.filter((v): v is TinymathVariable => isObject(v));
      // a validation task passed before executing this and checked already there's a field
      let field = fieldName ? indexPattern.getFieldByName(fieldName.value) : undefined;
      if (!shouldHaveFieldArgument(node) && !field) {
        field = documentField;
      }

      const mappedParams = {
        ...mergeWithGlobalFilters(
          nodeOperation,
          getOperationParams(nodeOperation, namedArguments || []),
          globalFilter,
          globalReducedTimeRange
        ),
        usedInMath: true,
      };

      const newCol = (
        nodeOperation as OperationDefinition<GenericIndexPatternColumn, 'field'>
      ).buildColumn(
        {
          layer,
          indexPattern,
          // checked in the validation phase
          field: field!,
        },
        mappedParams
      );
      const newColId = getManagedId(idPrefix, columns.length);
      newCol.customLabel = true;
      newCol.label = label;
      columns.push({ column: newCol, location: node.location });
      // replace by new column id
      return newColId;
    }

    if (nodeOperation.input === 'fullReference') {
      const [referencedOp] = functions;
      const consumedParam = parseNode(referencedOp);
      const hasActualMathContent = typeof consumedParam !== 'string';

      if (hasActualMathContent) {
        const subNodeVariables = consumedParam ? findVariables(consumedParam) : [];
        const mathColumn = mathOperation.buildColumn({
          layer,
          indexPattern,
        });
        mathColumn.references = subNodeVariables.map(({ value }) => value);
        mathColumn.params.tinymathAst = consumedParam!;
        columns.push({ column: mathColumn });
        mathColumn.customLabel = true;
        mathColumn.label = label;
      }

      const mappedParams = mergeWithGlobalFilters(
        nodeOperation,
        getOperationParams(nodeOperation, namedArguments || []),
        globalFilter,
        globalReducedTimeRange
      );
      const newCol = (
        nodeOperation as OperationDefinition<GenericIndexPatternColumn, 'fullReference'>
      ).buildColumn(
        {
          layer,
          indexPattern,
          referenceIds: [
            hasActualMathContent
              ? getManagedId(idPrefix, columns.length - 1)
              : (consumedParam as string),
          ],
        },
        mappedParams
      );
      const newColId = getManagedId(idPrefix, columns.length);
      newCol.customLabel = true;
      newCol.label = label;
      columns.push({ column: newCol, location: node.location });
      // replace by new column id
      return newColId;
    }

    if (nodeOperation.input === 'managedReference' && nodeOperation.usedInMath) {
      const newCol = (
        nodeOperation as OperationDefinition<GenericIndexPatternColumn, 'managedReference'>
      ).buildColumn({
        layer,
        indexPattern,
      });
      const newColId = getManagedId(idPrefix, columns.length);
      newCol.customLabel = true;
      newCol.label = label;
      columns.push({ column: newCol, location: node.location });
      // replace by new column id
      return newColId;
    }
  }

  const root = parseNode(ast);
  if (root === undefined) {
    return [];
  }
  const topLevelMath = typeof root !== 'string';
  if (topLevelMath) {
    const variables = findVariables(root);
    const mathColumn = mathOperation.buildColumn({
      layer,
      indexPattern,
    });
    mathColumn.references = variables.map(({ value }) => value);
    mathColumn.params.tinymathAst = root!;
    mathColumn.customLabel = true;
    mathColumn.label = label;
    columns.push({ column: mathColumn });
  }
  return columns;
}

interface ExpandColumnProperties {
  indexPattern: IndexPattern;
  operations?: Record<string, GenericOperationDefinition>;
  dateRange?: DateRange;
  strictShiftValidation?: boolean;
}

const getEmptyColumnsWithFormulaMeta = (): {
  columns: Record<string, GenericIndexPatternColumn>;
  meta: {
    locations: Record<string, TinymathLocation>;
  };
} => ({
  columns: {},
  meta: {
    locations: {},
  },
});

function generateFormulaColumns(
  id: string,
  column: FormulaIndexPatternColumn,
  layer: FormBasedLayer,
  { indexPattern, operations = operationDefinitionMap, dateRange }: ExpandColumnProperties
) {
  const { columns, meta } = getEmptyColumnsWithFormulaMeta();
  const formula = column.params.formula || '';

  const { extracted, isValid } = parseAndExtract(
    formula,
    layer,
    id,
    indexPattern,
    filterByVisibleOperation(operations),
    dateRange,
    column.customLabel ? column.label : undefined
  );

  extracted.forEach(({ column: extractedColumn, location }, index) => {
    const managedId = getManagedId(id, index);
    columns[managedId] = extractedColumn;

    if (location) {
      meta.locations[managedId] = location;
    }
  });

  columns[id] = {
    ...column,
    label: !column.customLabel
      ? formula ??
        i18n.translate('xpack.lens.indexPattern.formulaLabel', {
          defaultMessage: 'Formula',
        })
      : column.label,
    references: !isValid ? [] : [getManagedId(id, extracted.length - 1)],
    params: {
      ...column.params,
      formula,
      isFormulaBroken: !isValid,
    },
  } as FormulaIndexPatternColumn;

  return { columns, meta };
}

/** @internal **/
export function insertOrReplaceFormulaColumn(
  id: string,
  column: FormulaIndexPatternColumn,
  baseLayer: FormBasedLayer,
  params: ExpandColumnProperties
) {
  const layer = {
    ...baseLayer,
    columns: {
      ...baseLayer.columns,
      [id]: {
        ...column,
      },
    },
  };

  const { columns: updatedColumns, meta } = Object.entries(layer.columns).reduce(
    (acc, [currentColumnId, currentColumn]) => {
      if (currentColumnId.startsWith(id)) {
        if (currentColumnId === id && isFormulaIndexPatternColumn(currentColumn)) {
          const formulaColumns = generateFormulaColumns(
            currentColumnId,
            currentColumn,
            layer,
            params
          );
          acc.columns = { ...acc.columns, ...formulaColumns.columns };
          acc.meta = { ...acc.meta, ...formulaColumns.meta };
        }
      } else {
        acc.columns[currentColumnId] = { ...currentColumn };
      }
      return acc;
    },
    getEmptyColumnsWithFormulaMeta()
  );

  return {
    layer: {
      ...layer,
      columns: updatedColumns,
      columnOrder: getColumnOrder({
        ...layer,
        columns: updatedColumns,
      }),
    },
    meta,
  };
}
