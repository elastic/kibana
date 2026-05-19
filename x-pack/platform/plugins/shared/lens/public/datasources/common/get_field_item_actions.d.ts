import { type DragDropIdentifier } from '@kbn/dom-drag-drop';
import type { FieldItemButtonProps, FieldListItem } from '@kbn/unified-field-list';
import { type DataViewField } from '@kbn/data-views-plugin/common';
interface GetFieldItemActionsParams<T extends FieldListItem> {
    value: DragDropIdentifier;
    dropOntoWorkspace: (value: DragDropIdentifier) => void;
    hasSuggestionForField: (value: DragDropIdentifier) => boolean;
    closeFieldPopover?: () => void;
}
interface GetFieldItemActionsResult<T extends FieldListItem> {
    buttonAddFieldToWorkspaceProps: FieldItemButtonProps<T>['buttonAddFieldToWorkspaceProps'];
    onAddFieldToWorkspace: FieldItemButtonProps<T | DataViewField>['onAddFieldToWorkspace'];
}
export declare function getFieldItemActions<T extends FieldListItem>({ value, hasSuggestionForField, dropOntoWorkspace, closeFieldPopover, }: GetFieldItemActionsParams<T>): GetFieldItemActionsResult<T>;
export {};
