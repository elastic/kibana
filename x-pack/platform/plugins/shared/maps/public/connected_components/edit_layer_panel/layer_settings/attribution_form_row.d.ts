import React from 'react';
import type { Attribution } from '../../../../common/descriptor_types';
import type { ILayer } from '../../../classes/layers/layer';
interface Props {
    layer: ILayer;
    onChange: (attribution?: Attribution) => void;
}
export declare function AttributionFormRow(props: Props): React.JSX.Element | null;
export {};
