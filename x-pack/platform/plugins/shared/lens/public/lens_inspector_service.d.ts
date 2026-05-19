import type { Adapters, InspectorOptions, Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
export declare const getLensInspectorService: (inspector: InspectorStartContract) => {
    getInspectorAdapters: () => Adapters;
    inspect: (options?: InspectorOptions) => import("@kbn/core/public").OverlayRef;
    closeInspector: () => Promise<void | undefined>;
};
