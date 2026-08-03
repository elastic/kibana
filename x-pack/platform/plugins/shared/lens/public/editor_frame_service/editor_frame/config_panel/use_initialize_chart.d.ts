import { type MutableRefObject } from 'react';
import { type AggregateQuery, type Query } from '@kbn/es-query';
import type { TypedLensSerializedState } from '@kbn/lens-common';
import { type ESQLDataGridAttrs } from '../../../app_plugin/shared/edit_on_the_fly/helpers';
type LensAttributes = TypedLensSerializedState['attributes'];
export interface InitializeChartLogicArgs {
    /**
     * Indicates if the query is in text-based language (ESQL).
     */
    isTextBasedLanguage: boolean;
    /**
     * The query to be executed.
     */
    query: AggregateQuery | Query;
    /**
     * Attributes for the ESQL data grid, if applicable.
     */
    dataGridAttrs: ESQLDataGridAttrs | undefined;
    /**
     * Indicates if the dataGridAttrs havw been initialized.
     */
    isInitialized: boolean;
    /**
     * Current attributes of the chart.
     */
    currentAttributes: LensAttributes | undefined;
    /**
     * Reference to the previous query.
     */
    prevQueryRef: MutableRefObject<AggregateQuery | Query>;
    /**
     * Function to set errors that occur during initialization.
     */
    setErrors: (errors: Error[]) => void;
    /**
     * Function to set the initialization state.
     */
    setIsInitialized: (isInitialized: boolean) => void;
    /**
     * Function to run the query and update the chart.
     */
    runQuery: (q: AggregateQuery, abortController?: AbortController, shouldUpdateAttrs?: boolean) => Promise<void>;
}
/**
 * Encapsulates the logic for initializing the chart/data grid based on ESQL query.
 *
 */
export declare const createInitializeChartFunction: ({ isTextBasedLanguage, query, dataGridAttrs, isInitialized, currentAttributes, runQuery, prevQueryRef, setErrors, setIsInitialized, }: InitializeChartLogicArgs) => (abortController?: AbortController) => Promise<void>;
export declare function useInitializeChart({ isTextBasedLanguage, query, dataGridAttrs, isInitialized, currentAttributes, runQuery, prevQueryRef, setErrors, setIsInitialized, }: InitializeChartLogicArgs): void;
export {};
