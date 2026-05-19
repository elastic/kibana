import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '@kbn/lens-common';
export interface LegacyMetricVisualizationPluginSetupPlugins {
    editorFrame: EditorFrameSetup;
    charts: ChartsPluginSetup;
}
export declare class LegacyMetricVisualization {
    setup(core: CoreSetup, { editorFrame, charts }: LegacyMetricVisualizationPluginSetupPlugins): void;
}
