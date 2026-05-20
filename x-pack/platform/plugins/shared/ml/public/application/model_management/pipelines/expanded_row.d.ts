import type { FC } from 'react';
import type { IngestStatsResponse } from './pipelines';
interface ProcessorsStatsProps {
    stats: Exclude<IngestStatsResponse, undefined>['pipelines'][string]['processors'];
}
export declare const ProcessorsStats: FC<ProcessorsStatsProps>;
export {};
