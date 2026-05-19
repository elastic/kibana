import type { PaletteRegistry } from '@kbn/coloring';
import type { Ast } from '@kbn/interpreter';
import type { ThemeServiceStart } from '@kbn/core/public';
import type { DatasourceLayers, MetricVisualizationState } from '@kbn/lens-common';
export declare const toExpression: (paletteService: PaletteRegistry, state: MetricVisualizationState, datasourceLayers: DatasourceLayers, datasourceExpressionsByLayers: Record<string, Ast> | undefined, theme: ThemeServiceStart) => Ast | null;
