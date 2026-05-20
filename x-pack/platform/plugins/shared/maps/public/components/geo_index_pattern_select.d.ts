import React from 'react';
import type { DataView } from '@kbn/data-plugin/common';
interface Props {
    onChange: (indexPattern: DataView) => void;
    dataView?: DataView | null;
    isGeoPointsOnly?: boolean;
}
export declare function GeoIndexPatternSelect(props: Props): React.JSX.Element;
export {};
