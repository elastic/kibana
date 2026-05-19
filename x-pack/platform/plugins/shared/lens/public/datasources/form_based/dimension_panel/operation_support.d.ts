import type { DatasourceDimensionProps, IndexPatternMap, FormBasedPrivateState } from '@kbn/lens-common';
import type { OperationType } from '../form_based';
export interface OperationSupportMatrix {
    operationByField: Map<string, Set<OperationType>>;
    operationWithoutField: Set<OperationType>;
    fieldByOperation: Map<OperationType, Set<string>>;
}
type Props = Pick<DatasourceDimensionProps<FormBasedPrivateState>, 'layerId' | 'columnId' | 'filterOperations'> & {
    state: FormBasedPrivateState;
    indexPatterns: IndexPatternMap;
};
export declare const getOperationSupportMatrix: (props: Props) => OperationSupportMatrix;
export {};
