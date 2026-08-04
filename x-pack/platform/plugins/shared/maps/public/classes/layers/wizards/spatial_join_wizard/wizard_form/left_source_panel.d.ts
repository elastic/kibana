import React from 'react';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
interface Props {
    dataView?: DataView;
    geoField: string | undefined;
    geoFields: DataViewField[];
    onDataViewSelect: (dataView: DataView) => void;
    onGeoFieldSelect: (fieldName?: string) => void;
}
export declare function LeftSourcePanel(props: Props): React.JSX.Element;
export {};
