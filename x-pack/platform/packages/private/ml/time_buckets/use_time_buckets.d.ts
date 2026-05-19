import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { TimeBuckets } from './time_buckets';
/**
 * Custom hook to get `TimeBuckets` configured with settings from the `IUiSettingsClient`.
 *
 * @param uiSettings The UI settings client instance used to retrieve UI settings.
 * @returns  A memoized `TimeBuckets` instance configured with relevant UI settings.
 */
export declare const useTimeBuckets: (uiSettings: IUiSettingsClient) => TimeBuckets;
