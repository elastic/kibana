/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from 'ui/storage';
import { UiSettingsClientContract } from 'src/core/public';
import { termsOperation } from './terms';
import { minOperation, averageOperation, sumOperation, maxOperation } from './metrics';
import { dateHistogramOperation } from './date_histogram';
import { countOperation } from './count';
import { filterRatioOperation } from './filter_ratio';
import {
  IndexPatternColumn,
  OperationType,
  BaseIndexPatternColumn,
  IndexPatternField,
  IndexPatternPrivateState,
  IndexPattern,
  FieldBasedIndexPatternColumn,
} from '../../indexpattern';
import { DimensionPriority, StateSetter, OperationMetadata } from '../../../types';

/**
 * Properties passed to the operation-specific part of the popover editor
 */
export interface ParamEditorProps {
  state: IndexPatternPrivateState;
  setState: StateSetter<IndexPatternPrivateState>;
  columnId: string;
  layerId: string;
  uiSettings: UiSettingsClientContract;
  storage: Storage;
}

interface BaseOperationDefinitionProps<C extends BaseIndexPatternColumn> {
  type: C['operationType'];
  /**
   * The name of the operation shown to the user (e.g. in the popover editor).
   * Should be i18n-ified.
   */
  displayName: string;
  // TODO move into field specific part
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
  paramEditor?: React.ComponentType<ParamEditorProps>;
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

type FieldBasedOperationDefinition<C extends BaseIndexPatternColumn> = BaseOperationDefinitionProps<
  C
> & {
  /**
   * Returns the meta data of the operation if applied to the given field. Undefined
   * if the field is not applicable to the operation.
   */
  getPossibleOperationForField: (field: IndexPatternField) => OperationMetadata | undefined;
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
};

type DocumentBasedOperationDefinition<
  C extends BaseIndexPatternColumn
> = BaseOperationDefinitionProps<C> & {
  /**
   * Returns the meta data of the operation if applied to documents of the given index pattern.
   * Undefined if the operation is not applicable to the index pattern.
   */
  getPossibleOperationForDocument: (indexPattern: IndexPattern) => OperationMetadata | undefined;
  buildColumn: (arg: BaseBuildColumnArgs) => C;
};

/**
 * Shape of an operation definition. If the type parameter of the definition
 * indicates a field based column, `getPossibleOperationForField` has to be
 * specified, otherwise `getPossibleOperationForDocument` has to be defined.
 */
export type OperationDefinition<
  C extends BaseIndexPatternColumn
> = C extends FieldBasedIndexPatternColumn
  ? FieldBasedOperationDefinition<C>
  : DocumentBasedOperationDefinition<C>;

// This type is like mapping over a union of types
// Each possible column type out of the `IndexPatternColumn` union type
// is wrapped into an `OperationDefinition`. The resulting type
// is a union type of all operation definitions
type PossibleOperationDefinition<
  U extends IndexPatternColumn = IndexPatternColumn
> = U extends IndexPatternColumn ? OperationDefinition<U> : never;

// This type once again maps over the union of all operation definitions
// and wraps them in an object with the definition as a single property. The key of
// the property is the operation type of the definition.
// E.g. the terms operation definition maps to `{ terms: OperationDefinition<TermsColumn> }`
// and so on.
type PossibleOperationDefinitionMapEntries<
  U extends PossibleOperationDefinition = PossibleOperationDefinition
> = U extends PossibleOperationDefinition ? { [K in U['type']]: U } : never;

// This is a helper type changing a union (`a | b | c`) into an intersection `a & b & c`
type UnionToIntersection<U> = (U extends U ? (k: U) => void : never) extends ((k: infer I) => void)
  ? I
  : never;

// Here, the helper from above is used to turn the union of all partial operation definition entries
// into an intersection - `{ terms: OperationDefinition<TermsColumn>, avg: OperationDefinition<AvgColumn>, ...}
// This type makes sure that
// a) there is an operation definition for each column type
// b) Each operation definition maps to the correct key in the map and there are no mix-ups
type AllOperationDefinitions = UnionToIntersection<PossibleOperationDefinitionMapEntries>;

// This is the map of all available operation definitions. If you are adding a new
// operation and column type, you have to add it to this list, otherwise typescript
// will throw an error.
const internalOperationDefinitionMap: AllOperationDefinitions = {
  terms: termsOperation,
  date_histogram: dateHistogramOperation,
  min: minOperation,
  max: maxOperation,
  avg: averageOperation,
  sum: sumOperation,
  count: countOperation,
  filter_ratio: filterRatioOperation,
};

/**
 * List of all available operation definitions
 */
export const operationDefinitions: PossibleOperationDefinition[] = Object.values(
  internalOperationDefinitionMap
);

/**
 * Map of all operation visible to consumers (e.g. the dimension panel).
 * This simplifies the type of the map and makes it a simple list of unspecified
 * operations definitions, because typescript can't infer the type correctly in most
 * situations.
 *
 * If you need a specifically typed version of an operation (e.g. explicitly working with terms),
 * you should import the terms definition directly from the sub folder. This map is
 * intended to be used in situations where the operation type is not known during compile
 * time.
 */
export const operationDefinitionMap = (internalOperationDefinitionMap as unknown) as Record<
  OperationType,
  | FieldBasedOperationDefinition<BaseIndexPatternColumn>
  | DocumentBasedOperationDefinition<BaseIndexPatternColumn>
>;
