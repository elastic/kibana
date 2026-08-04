import React from 'react';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { ILayer } from '../../../../../classes/layers/layer';
interface Props {
    inspectorAdapters: Adapters;
    layer: ILayer;
}
export declare function LegendDetails({ inspectorAdapters, layer }: Props): React.JSX.Element | null;
export {};
