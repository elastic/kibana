import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
/**
 * Normalizes `tableSeverity` from SMV page vs embeddable vs dashboard into `SeverityThreshold[]`
 * for `getAnomaliesTableData`.
 *
 * - **Array** — already API-shaped; returned by reference.
 * - **Number** — legacy single minimum → `[{ min: n }]`.
 * - **`{ val: SeverityThreshold[] }`** — publishing / app-state wrapper (must be a non-null array).
 * - **Anything else** — `[{ min: 0 }]`.
 */
export declare function normalizeSeverityThresholdForApi(tableSeverity: unknown): SeverityThreshold[];
