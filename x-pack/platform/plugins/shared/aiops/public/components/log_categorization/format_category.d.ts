import type { FC } from 'react';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
interface Props {
    category: Category;
    count?: number;
}
export declare const useCreateFormattedExample: () => (key: string, example: string) => JSX.Element[];
export declare const FormattedPatternExamples: FC<Props>;
export declare const FormattedRegex: FC<Props>;
export declare const FormattedTokens: FC<Props>;
export {};
