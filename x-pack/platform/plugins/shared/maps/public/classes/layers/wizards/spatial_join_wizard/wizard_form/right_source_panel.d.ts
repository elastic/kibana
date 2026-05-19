import React from 'react';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
interface Props {
    dataView?: DataView;
    distance: number;
    geoField: string | undefined;
    geoFields: DataViewField[];
    onDataViewSelect: (dataView: DataView) => void;
    onDistanceChange: (distance: number) => void;
    onGeoFieldSelect: (fieldName?: string) => void;
}
export declare function RightSourcePanel(props: Props): React.JSX.Element;
export {};
