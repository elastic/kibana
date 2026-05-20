import type { CoreStart } from '@kbn/core/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { VisualizationMap, DatasourceMap } from '@kbn/lens-common';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { InlineEditLensEmbeddableContext } from './types';
export declare class EditLensEmbeddableAction implements Action<InlineEditLensEmbeddableContext> {
    protected readonly core: CoreStart;
    protected readonly dependencies: LensPluginStartDependencies & {
        visualizationMap: VisualizationMap;
        datasourceMap: DatasourceMap;
    };
    type: string;
    id: string;
    order: number;
    constructor(core: CoreStart, dependencies: LensPluginStartDependencies & {
        visualizationMap: VisualizationMap;
        datasourceMap: DatasourceMap;
    });
    getDisplayName(): string;
    getIconType(): string;
    isCompatible({ attributes }: InlineEditLensEmbeddableContext): Promise<any>;
    execute({ attributes, lensEvent, container, onUpdate, onApply, onCancel, applyButtonLabel, }: InlineEditLensEmbeddableContext): Promise<void>;
}
