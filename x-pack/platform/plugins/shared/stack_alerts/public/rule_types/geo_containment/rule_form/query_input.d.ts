import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Query } from '@kbn/es-query';
interface Props {
    dataView?: DataView;
    onChange: (query: Query) => void;
    query?: Query;
}
export declare const QueryInput: (props: Props) => React.JSX.Element;
export {};
