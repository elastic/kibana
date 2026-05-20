import type { CoreSetup } from '@kbn/core/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '@kbn/lens-common';
import type { LensPluginStartDependencies } from '../../plugin';
import type { FormatFactory } from '../../../common/types';
export interface XyVisualizationPluginSetupPlugins {
    expressions: ExpressionsSetup;
    formatFactory: FormatFactory;
    editorFrame: EditorFrameSetup;
    charts: ChartsPluginSetup;
}
export declare class XyVisualization {
    setup(core: CoreSetup<LensPluginStartDependencies, void>, { editorFrame }: XyVisualizationPluginSetupPlugins): void;
}
