import type { FC } from 'react';
import type { DFAModelItem } from '@kbn/ml-common-types/trained_models';
interface Props {
    model: DFAModelItem;
    onClose: () => void;
}
export declare const TestDfaModelsFlyout: FC<Props>;
export {};
