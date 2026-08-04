import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { FormatFactory } from '@kbn/visualization-ui-components';
import type { EditorFrameSetup } from '@kbn/lens-common';
export interface TagcloudVisualizationPluginSetupPlugins {
    editorFrame: EditorFrameSetup;
    charts: ChartsPluginSetup;
    formatFactory: FormatFactory;
}
export declare class TagcloudVisualization {
    setup(core: CoreSetup, { editorFrame, formatFactory, charts }: TagcloudVisualizationPluginSetupPlugins): void;
}
