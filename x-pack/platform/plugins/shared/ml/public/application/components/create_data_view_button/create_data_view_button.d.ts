import React from 'react';
import { type DataView } from '@kbn/data-plugin/common';
export declare const CreateDataViewButton: ({ onDataViewCreated, allowAdHocDataView, }: {
    onDataViewCreated: (dataView: DataView) => void;
    allowAdHocDataView?: boolean;
}) => React.JSX.Element | null;
