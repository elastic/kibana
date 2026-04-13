import type { Streams } from '@kbn/streams-schema';
import type { FeaturesIdentificationTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/features/route';
interface StreamFeaturesApi {
    getFeaturesIdentificationStatus: () => Promise<FeaturesIdentificationTaskResult>;
    scheduleFeaturesIdentificationTask: (connectorId: string) => Promise<void>;
    cancelFeaturesIdentificationTask: () => Promise<void>;
    deleteFeature: (uuid: string) => Promise<void>;
    deleteFeaturesInBulk: (uuids: string[]) => Promise<void>;
}
export declare function useStreamFeaturesApi(definition: Streams.all.Definition): StreamFeaturesApi;
export {};
