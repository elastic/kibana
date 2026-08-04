import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
export declare const discoverDrilldownSchema: import("@kbn/config-schema").ObjectType<{
    open_in_new_tab: import("@kbn/config-schema").Type<boolean>;
}>;
export declare function registerDiscoverDrilldown(embeddableSetup: EmbeddableSetup): void;
