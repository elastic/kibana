import type { FC } from 'react';
import type { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '@kbn/ml-category-validator';
import { type CategorizationAnalyzer, type FieldExampleCheck } from '@kbn/ml-category-validator';
interface Props {
    validationChecks: FieldExampleCheck[];
    overallValidStatus: CATEGORY_EXAMPLES_VALIDATION_STATUS;
    categorizationAnalyzer: CategorizationAnalyzer;
}
export declare const ExamplesValidCallout: FC<Props>;
export {};
