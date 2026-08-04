import type { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/public';
import type { CoreSetup } from '@kbn/core/public';
import type { MapsPluginStartDependencies } from '../../plugin';
import type { ChoroplethChartProps } from './types';
export declare const RENDERER_ID = "lens_choropleth_chart_renderer";
export declare function getExpressionRenderer(coreSetup: CoreSetup<MapsPluginStartDependencies>): {
    name: string;
    displayName: string;
    help: string;
    validate: () => undefined;
    reuseDomNode: boolean;
    render: (domNode: Element, config: ChoroplethChartProps, handlers: IInterpreterRenderHandlers) => Promise<void>;
};
