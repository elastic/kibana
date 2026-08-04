import type { CoreStart } from '@kbn/core/public';
import type { DatasourceMap, VisualizationMap, TypedLensByValueInput } from '@kbn/lens-common';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { LensChartLoadEvent } from './types';
export declare function isEmbeddableEditActionCompatible(core: CoreStart, attributes: TypedLensByValueInput['attributes']): any;
export declare function getEditEmbeddableFlyout({ core, deps, attributes, lensEvent, container, onUpdate, onApply, onCancel, closeFlyout, applyButtonLabel, }: {
    core: CoreStart;
    deps: LensPluginStartDependencies & {
        visualizationMap: VisualizationMap;
        datasourceMap: DatasourceMap;
    };
    attributes: TypedLensByValueInput['attributes'];
    lensEvent: LensChartLoadEvent;
    container?: HTMLElement | null;
    onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => void;
    onApply?: (newAttributes: TypedLensByValueInput['attributes']) => void;
    onCancel?: () => void;
    closeFlyout: () => void;
    applyButtonLabel?: string;
}): Promise<import("react").JSX.Element | null>;
