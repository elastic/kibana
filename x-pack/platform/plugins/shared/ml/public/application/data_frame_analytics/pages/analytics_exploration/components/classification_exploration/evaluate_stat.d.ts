import type { FC } from 'react';
interface Props {
    isLoading: boolean;
    title: number | null;
    description: string;
    dataTestSubj: string;
    tooltipContent: string;
}
export declare const EvaluateStat: FC<Props>;
export {};
