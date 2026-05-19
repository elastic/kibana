import { type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { EmbeddableSetup, GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
export declare function registerLensEmbeddableTransforms(embeddableSetup: EmbeddableSetup, builder: LensConfigBuilder): void;
export declare const getLensByValuePanelSchema: (getDrilldownsSchema: GetDrilldownsSchemaFnType) => import("@kbn/config-schema").Type<import("@kbn/lens-embeddable-utils").LensApiConfig & Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    references?: Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
} & {}>>;
export declare const getLensPanelSchema: (getDrilldownsSchema: GetDrilldownsSchemaFnType) => import("@kbn/config-schema").Type<(import("@kbn/lens-embeddable-utils").LensApiConfig & Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    references?: Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
} & {}>) | Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    references?: Readonly<{} & {
        name: string;
        id: string;
        type: string;
    }>[] | undefined;
    drilldowns?: import("@kbn/embeddable-plugin/server").DrilldownState[] | undefined;
} & {
    ref_id: string;
}>>;
