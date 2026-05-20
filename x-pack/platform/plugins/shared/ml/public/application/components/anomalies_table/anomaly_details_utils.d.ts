import type { FC } from 'react';
import React from 'react';
import { type MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import type { EntityCellFilter } from '../entity_cell';
export declare function getInfluencersItems(anomalyInfluencers: Array<Record<string, string>>, influencerFilter: EntityCellFilter, numToDisplay: number): {
    title: string;
    description: React.ReactElement;
}[];
export declare const DetailsItems: FC<{
    anomaly: MlAnomaliesTableRecord;
    filter?: EntityCellFilter;
    modelPlotEnabled: boolean;
}>;
export declare const AnomalyExplanationDetails: FC<{
    anomaly: MlAnomaliesTableRecord;
}>;
