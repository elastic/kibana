import React from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { type Props as SingleFieldSelectProps } from './single_field_select';
type Props = SingleFieldSelectProps & {
    geoFields: DataViewField[];
};
export declare function GeoFieldSelect(props: Props): React.JSX.Element;
export {};
