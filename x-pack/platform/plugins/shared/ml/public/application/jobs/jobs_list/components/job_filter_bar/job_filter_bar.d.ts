import type { FC } from 'react';
import type { Query } from '@elastic/eui';
interface JobFilterBarProps {
    setFilters: (query: Query | null) => void;
    queryText?: string;
}
export declare const JobFilterBar: FC<JobFilterBarProps>;
export {};
