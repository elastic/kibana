import type { FC } from 'react';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
interface Props {
    validationResults: FieldValidationResults | null;
}
export declare const FieldValidationCallout: FC<Props>;
export {};
