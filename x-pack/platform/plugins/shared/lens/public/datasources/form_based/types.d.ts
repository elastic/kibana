import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import type { IndexPattern, IndexPatternField, DragDropOperation, GenericIndexPatternColumn } from '@kbn/lens-common';
export type DraggedField = DragDropIdentifier & {
    field: IndexPatternField;
    indexPatternId: string;
};
export interface DataViewDragDropOperation extends DragDropOperation {
    dataView: IndexPattern;
    column?: GenericIndexPatternColumn;
}
