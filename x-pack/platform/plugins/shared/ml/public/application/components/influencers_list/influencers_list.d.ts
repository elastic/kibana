import type { FC } from 'react';
import type { EntityCellFilter } from '../entity_cell';
export interface InfluencerValueData {
    influencerFieldValue: string;
    maxAnomalyScore: number;
    sumAnomalyScore: number;
}
interface InfluencersListProps {
    influencers: {
        [id: string]: InfluencerValueData[];
    };
    influencerFilter: EntityCellFilter;
}
export declare const InfluencersList: FC<InfluencersListProps>;
export {};
