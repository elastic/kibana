import React from 'react';
import type { ESQLColumn } from '@kbn/es-types';
interface Props {
    esql: string;
    onESQLChange: ({ adhocDataViewId, columns, dateFields, geoFields, esql, }: {
        adhocDataViewId: string;
        columns: ESQLColumn[];
        dateFields: string[];
        geoFields: string[];
        esql: string;
    }) => void;
}
export declare function ESQLEditor(props: Props): React.JSX.Element;
export {};
