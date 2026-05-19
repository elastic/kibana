import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '@kbn/lens-common';
export interface MetricVisualizationPluginSetupPlugins {
    editorFrame: EditorFrameSetup;
    charts: ChartsPluginSetup;
}
export declare class MetricVisualization {
    setup(core: CoreSetup, { editorFrame, charts }: MetricVisualizationPluginSetupPlugins): void;
}
