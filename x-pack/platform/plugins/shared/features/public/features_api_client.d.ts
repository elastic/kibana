import type { HttpSetup } from '@kbn/core/public';
import type { KibanaFeature } from '.';
export declare class FeaturesAPIClient {
    private readonly http;
    constructor(http: HttpSetup);
    getFeatures(): Promise<KibanaFeature[]>;
}
