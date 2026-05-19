import type { FC } from 'react';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DocumentCountStats } from '@kbn/aiops-log-rate-analysis/types';
import type { EventRate } from './use_categorize_request';
interface Props {
    totalCount: number;
    pinnedCategory: Category | null;
    selectedCategory: Category | null;
    eventRate: EventRate;
    documentCountStats?: DocumentCountStats;
}
export declare const DocumentCountChart: FC<Props>;
export {};
