import type { DragContextState, DropType } from '@kbn/dom-drag-drop';
import type { GenericIndexPatternColumn, FormBasedPrivateState, OperationMetadata, DragDropOperation, IndexPattern, IndexPatternMap, IndexPatternField } from '@kbn/lens-common';
interface GetDropPropsArgs {
    state: FormBasedPrivateState;
    source?: DragContextState['dragging'];
    target: DragDropOperation;
    indexPatterns: IndexPatternMap;
}
export declare function getNewOperation(field: IndexPatternField | undefined | false, filterOperations: (meta: OperationMetadata) => boolean, targetColumn?: GenericIndexPatternColumn, prioritizedOperation?: GenericIndexPatternColumn['operationType'], alreadyUsedOperations?: Set<string>): string | undefined;
export declare function getField(column: GenericIndexPatternColumn | undefined, dataView: IndexPattern): IndexPatternField | undefined;
export declare function getDropProps(props: GetDropPropsArgs): {
    dropTypes: DropType[];
    nextLabel?: string;
} | undefined;
export {};
