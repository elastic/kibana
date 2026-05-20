import type { LocatorDefinition, KibanaLocation } from '@kbn/share-plugin/public';
import type { MlLocatorParams, MlLocator } from '@kbn/ml-common-types/locator';
export type { MlLocatorParams, MlLocator };
export declare class MlLocatorDefinition implements LocatorDefinition<MlLocatorParams> {
    readonly id = "ML_APP_LOCATOR";
    private validPaths;
    readonly getLocation: (params: MlLocatorParams) => Promise<KibanaLocation>;
}
