import type { BoundOutputAPI, BoundOptions, OutputAPI } from '@kbn/inference-common';
/**
 * Bind output to the provided parameters,
 * returning a bound version of the API.
 */
export declare function bindOutput(outputApi: OutputAPI, boundParams: BoundOptions): BoundOutputAPI;
