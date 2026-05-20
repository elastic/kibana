import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { LensAppLocatorParams, LensShareableState } from '@kbn/lens-common';
export declare class LensAppLocatorDefinition implements LocatorDefinition<LensAppLocatorParams> {
    readonly id = "LENS_APP_LOCATOR";
    readonly getLocation: (params: LensAppLocatorParams) => Promise<{
        app: string;
        path: string;
        state: {
            type: string;
            payload: LensShareableState | Omit<LensShareableState, "references" | "visualization" | "datasourceStates" | "activeDatasourceId">;
        };
    }>;
}
