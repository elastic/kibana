import type { SavedObjectsFindOptions, SavedObjectsFindResponse } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
/**
 * Extends the SavedObjectsClient to fit the telemetry fetching requirements (i.e.: find objects from all namespaces by default)
 */
export declare class TelemetrySavedObjectsClient extends SavedObjectsClient {
    /**
     * Find the SavedObjects matching the search query in all the Spaces by default
     * @param options
     */
    find<T = unknown, A = unknown>(options: SavedObjectsFindOptions): Promise<SavedObjectsFindResponse<T, A>>;
}
