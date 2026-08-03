import React from 'react';
import type { DataFilters } from '../../../../common/descriptor_types';
import type { ISource } from '../../../classes/sources/source';
export interface Props {
    source: ISource;
    dataFilters: DataFilters;
}
export declare function SourceDetails(props: Props): React.JSX.Element;
