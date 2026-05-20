import type { FC } from 'react';
import type { CategoryFieldExample } from '@kbn/ml-category-validator';
interface Props {
    fieldExamples: CategoryFieldExample[] | null;
}
export declare const FieldExamples: FC<Props>;
export {};
