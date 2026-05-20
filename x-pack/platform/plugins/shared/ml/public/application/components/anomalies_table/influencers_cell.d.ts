import type { FC } from 'react';
type InfluencerCellFilter = (influencerFieldName: string, influencerFieldValue: string, direction: '+' | '-') => void;
interface Influencer {
    influencerFieldName: string;
    influencerFieldValue: string;
}
interface InfluencerCellProps {
    influencerFilter: InfluencerCellFilter | undefined;
    influencers: Influencer[] | undefined;
    limit: number;
}
export declare const InfluencersCell: FC<InfluencerCellProps>;
export {};
