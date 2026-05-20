import type { AstFunction } from '@kbn/interpreter';
import type { IndexPattern, LensLayerType, TimeScaleUnit, FormBasedLayer, GenericIndexPatternColumn } from '@kbn/lens-common';
import type { FieldBasedOperationErrorMessage } from '..';
export declare const buildLabelFunction: (ofName: (name?: string) => string) => (name?: string, timeScale?: TimeScaleUnit, timeShift?: string) => string;
/**
 * Gets the effective label for a referenced column.
 * Returns the custom label if set, otherwise computes the default label.
 */
export declare const getReferencedColumnLabel: (refColumnId: string | undefined, columns: Record<string, GenericIndexPatternColumn>, indexPattern?: IndexPattern) => string | undefined;
export declare function checkForDataLayerType(layerType: LensLayerType, name: string): string[] | undefined;
/**
 * Checks whether the current layer includes a date histogram and returns an error otherwise
 */
export declare function checkForDateHistogram(layer: FormBasedLayer, name: string): FieldBasedOperationErrorMessage[];
export declare function checkReferences(layer: FormBasedLayer, columnId: string): FieldBasedOperationErrorMessage[];
export declare function getErrorsForDateReference(layer: FormBasedLayer, columnId: string, name: string): FieldBasedOperationErrorMessage[];
export declare function hasDateField(indexPattern: IndexPattern): boolean;
/**
 * Creates an expression ast for a date based operation (cumulative sum, derivative, moving average, counter rate)
 */
export declare function dateBasedOperationToExpression(layer: FormBasedLayer, columnId: string, functionName: string, additionalArgs: Record<string, unknown[]> | undefined, indexPattern: IndexPattern): AstFunction[];
/**
 * Creates an expression ast for a date based operation (cumulative sum, derivative, moving average, counter rate)
 */
export declare function optionalHistogramBasedOperationToExpression(layer: FormBasedLayer, columnId: string, functionName: string, additionalArgs?: Record<string, unknown[]>): AstFunction[];
