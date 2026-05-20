import type { FC } from 'react';
export interface StatsBarStat {
    label: string;
    value: number;
    show?: boolean;
    'data-test-subj'?: string;
}
interface StatProps {
    stat: StatsBarStat;
}
export declare const Stat: FC<StatProps>;
export {};
