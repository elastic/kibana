/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { termsOperation } from './terms';
import { cardinalityOperation } from './cardinality';
import { minOperation, averageOperation, sumOperation, maxOperation } from './metrics';
import { dateHistogramOperation } from './date_histogram';
import { countOperation } from './count';
import { DimensionPriority, StateSetter, OperationMetadata } from '../../../types';
import { BaseIndexPatternColumn } from './column_types';
import { IndexPatternPrivateState, IndexPattern, IndexPatternField } from '../../types';
import { DateRange } from '../../../../common';

// List of all operation definitions registered to this data source.
// If you want to implement a new operation, add it to this array and
// its type will get propagated to everything else
const internalOperationDefinitions = [
  termsOperation,
  dateHistogramOperation,
  minOperation,
  maxOperation,
  averageOperation,
  cardinalityOperation,
  sumOperation,
  countOperation,
];

export { termsOperation } from './terms';
export { dateHistogramOperation } from './date_histogram';
export { minOperation, averageOperation, sumOperation, maxOperation } from './metrics';
export { countOperation } from './count';

/**
 * Properties passed to the operation-specific part of the popover editor
 */
export interface ParamEditorProps<C extends BaseIndexPatternColumn> {
  currentColumn: C;
  state: IndexPatternPrivateState;
  setState: StateSetter<IndexPatternPrivateState>;
  columnId: string;
  layerId: string;
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpSetup;
  dateRange: DateRange;
}

interface BaseOperationDefinitionProps<C extends BaseIndexPatternColumn> {
  type: C['operationType'];
  /**
   * The priority of the operation. If multiple operations are possible in
   * a given scenario (e.g. the user dragged a field into the workspace),
   * the operation with the highest priority is picked.
   */
  priority?: number;
  /**
   * The name of the operation shown to the user (e.g. in the popover editor).
   * Should be i18n-ified.
   */
  displayName: string;
  /**
   * This function is called if another column in the same layer changed or got removed.
   * Can be used to update references to other columns (e.g. for sorting).
   * Based on the current column and the other updated columns, this function has to
   * return an updated column. If not implemented, the `id` function is used instead.
   */
  onOtherColumnChanged?: (
    currentColumn: C,
    columns: Partial<Record<string, IndexPatternColumn>>
  ) => C;
  /**
   * React component for operation specific settings shown in the popover editor
   */
  paramEditor?: React.ComponentType<ParamEditorProps<C>>;
  /**
   * Function turning a column into an agg config passed to the `esaggs` function
   * together with the agg configs returned from other columns.
   */
  toEsAggsConfig: (column: C, columnId: string) => unknown;
  /**
   * Returns true if the `column` can also be used on `newIndexPattern`.
   * If this function returns false, the column is removed when switching index pattern
   * for a layer
   */
  isTransferable: (column: C, newIndexPattern: IndexPattern) => boolean;
  /**
   * Transfering a column to another index pattern. This can be used to
   * adjust operation specific settings such as reacting to aggregation restrictions
   * present on the new index pattern.
   */
  transfer?: (column: C, newIndexPattern: IndexPattern) => C;
}

interface BaseBuildColumnArgs {
  suggestedPriority: DimensionPriority | undefined;
  layerId: string;
  columns: Partial<Record<string, IndexPatternColumn>>;
  indexPattern: IndexPattern;
}

interface FieldBasedOperationDefinition<C extends BaseIndexPatternColumn>
  extends BaseOperationDefinitionProps<C> {
  /**
   * Returns the meta data of the operation if applied to the given field. Undefined
   * if the field is not applicable to the operation.
   */
  getPossibleOperationForField: (field: IndexPatternField) => OperationMetadata | undefined;
  /**
   * Builds the column object for the given parameters. Should include default p
   */
  buildColumn: (
    arg: BaseBuildColumnArgs & {
      field: IndexPatternField;
    }
  ) => C;
  /**
   * This method will be called if the user changes the field of an operation.
   * You must implement it and return the new column after the field change.
   * The most simple implementation will just change the field on the column, and keep
   * the rest the same. Some implementations might want to change labels, or their parameters
   * when changing the field.
   *
   * This will only be called for switching the field, not for initially selecting a field.
   *
   * See {@link OperationDefinition#transfer} for controlling column building when switching an
   * index pattern not just a field.
   *
   * @param oldColumn The column before the user changed the field.
   * @param indexPattern The index pattern that field is on.
   * @param field The field that the user changed to.
   */
  onFieldChange: (oldColumn: C, indexPattern: IndexPattern, field: IndexPatternField) => C;
}

/**
 * Shape of an operation definition. If the type parameter of the definition
 * indicates a field based column, `getPossibleOperationForField` has to be
 * specified, otherwise `getPossibleOperationForDocument` has to be defined.
 */
export type OperationDefinition<C extends BaseIndexPatternColumn> = FieldBasedOperationDefinition<
  C
>;

// Helper to to infer the column type out of the operation definition.
// This is done to avoid it to have to list out the column types along with
// the operation definition types
type ColumnFromOperationDefinition<D> = D extends OperationDefinition<infer C> ? C : never;

/**
 * A union type of all available column types. If a column is of an unknown type somewhere
 * withing the indexpattern data source it should be typed as `IndexPatternColumn` to make
 * typeguards possible that consider all available column types.
 */
export type IndexPatternColumn = ColumnFromOperationDefinition<
  typeof internalOperationDefinitions[number]
>;

/**
 * A union type of all available operation types. The operation type is a unique id of an operation.
 * Each column is assigned to exactly one operation type.
 */
export type OperationType = typeof internalOperationDefinitions[number]['type'];

/**
 * This is an operation definition of an unspecified column out of all possible
 * column types. It
 */
export type GenericOperationDefinition = FieldBasedOperationDefinition<IndexPatternColumn>;

/**
 * List of all available operation definitions
 */
export const operationDefinitions = internalOperationDefinitions as GenericOperationDefinition[];

/**
 * Map of all operation visible to consumers (e.g. the dimension panel).
 * This simplifies the type of the map and makes it a simple list of unspecified
 * operations definitions, because typescript can't infer the type correctly in most
 * situations.
 *
 * If you need a specifically typed version of an operation (e.g. explicitly working with terms),
 * you should import the definition directly from this file
 * (e.g. `import { termsOperation } from './operations/definitions'`). This map is
 * intended to be used in situations where the operation type is not known during compile time.
 */
export const operationDefinitionMap = internalOperationDefinitions.reduce(
  (definitionMap, definition) => ({ ...definitionMap, [definition.type]: definition }),
  {}
) as Record<OperationType, GenericOperationDefinition>;
