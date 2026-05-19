import type { FC } from 'react';
import type { FindFileStructureResponse } from '@kbn/file-upload-common';
import type { DataVisualizerTableState } from '../../../../../common/types';
export interface Props {
    results: FindFileStructureResponse;
}
export declare const getDefaultDataVisualizerListState: () => DataVisualizerTableState;
export declare const FieldsStatsGrid: FC<Props>;
