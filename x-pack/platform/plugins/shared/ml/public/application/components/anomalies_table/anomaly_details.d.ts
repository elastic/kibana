import type { FC } from 'react';
import { type MlAnomaliesTableRecordExtended } from '@kbn/ml-anomaly-utils';
import type { CategoryDefinition } from '../../services/ml_api_service/results';
import type { EntityCellFilter } from '../entity_cell';
import type { ExplorerJob } from '../../explorer/explorer_utils';
interface Props {
    anomaly: MlAnomaliesTableRecordExtended;
    isAggregatedData: boolean;
    influencersLimit: number;
    tabIndex: number;
    job: ExplorerJob;
    definition?: CategoryDefinition;
    examples?: string[];
    categoryDefinitionError?: string;
    filter?: EntityCellFilter;
    influencerFilter?: EntityCellFilter;
}
export declare const AnomalyDetails: FC<Props>;
export {};
