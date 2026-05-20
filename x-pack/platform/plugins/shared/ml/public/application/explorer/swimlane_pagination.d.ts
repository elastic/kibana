import type { FC } from 'react';
interface SwimLanePaginationProps {
    fromPage: number;
    perPage: number;
    cardinality: number;
    onPaginationChange: (arg: {
        perPage?: number;
        fromPage?: number;
    }) => void;
}
export declare const SwimLanePagination: FC<SwimLanePaginationProps>;
export {};
