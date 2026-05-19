import React from 'react';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { TileError } from '../../../common/descriptor_types';
interface Props {
    inspectorAdapters: Adapters;
    isESVectorTileSource: boolean;
    layerId: string;
    tileErrors: TileError[];
}
export declare function TileErrorsList(props: Props): React.JSX.Element | null;
export {};
