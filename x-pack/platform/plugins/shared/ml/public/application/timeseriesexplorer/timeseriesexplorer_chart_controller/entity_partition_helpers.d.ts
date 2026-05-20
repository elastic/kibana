import type { CriteriaField } from '@kbn/ml-common-types/results';
/**
 * Criteria fields for ML results APIs (e.g. getAnomaliesTableData).
 * Mirrors legacy logic from TimeSeriesExplorer#getCriteriaFields.
 */
export declare function buildCriteriaFields(detectorIndex: number, entities: Array<{
    fieldName: string;
    fieldValue: unknown | null;
}>): CriteriaField[];
export interface SmvEntityControl {
    fieldName: string;
    fieldValue: string | null;
}
/**
 * Shared table-filter handler for SMV page and embeddable chart.
 *
 * Applies an include (`+`) or exclude (`-`) filter from the anomalies table onto the
 * entity partition controls and forwards the merged result to `setEntities`.
 * No-ops when the field is not found, or when the operator would produce no change.
 */
export declare function applySmvTableFilter(field: string, value: string, operator: string, entityControls: SmvEntityControl[], setEntities: (entities: Record<string, string | null>) => void): void;
