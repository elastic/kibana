import type { FC } from 'react';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
interface ExpandedRowProps {
    category: Category;
    displayExamples?: boolean;
}
export declare const ExpandedRow: FC<ExpandedRowProps>;
export {};
