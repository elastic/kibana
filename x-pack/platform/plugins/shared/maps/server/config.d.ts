import type { TypeOf } from '@kbn/config-schema';
export interface MapsConfigType {
    showMapsInspectorAdapter: boolean;
    preserveDrawingBuffer: boolean;
}
export declare const configSchema: import("@kbn/config-schema").ObjectType<{
    showMapsInspectorAdapter: import("@kbn/config-schema").Type<boolean>;
    preserveDrawingBuffer: import("@kbn/config-schema").Type<boolean>;
}>;
export type MapsXPackConfig = TypeOf<typeof configSchema>;
