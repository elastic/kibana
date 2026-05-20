import type { FC } from 'react';
import type { JobsHealthRuleTestsConfig } from '@kbn/ml-common-types/alerts';
interface TestsSelectionControlProps {
    config: JobsHealthRuleTestsConfig;
    onChange: (update: JobsHealthRuleTestsConfig) => void;
    errors?: string[];
}
export declare const TestsSelectionControl: FC<TestsSelectionControlProps>;
export {};
