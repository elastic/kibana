import type { CommandMatchResult, CommandBadgeData } from './command_menu';
export interface MessageEditorInstance {
    ref: React.RefObject<HTMLDivElement>;
    onChange: () => void;
    onFocus: () => void;
    commandMatch: CommandMatchResult;
    /** Dismiss the active action menu */
    dismissActionMenu: () => void;
    /** Handle selection of an item from the command menu */
    handleCommandSelect: (selection: CommandBadgeData) => void;
}
export interface MessageEditorController {
    focus: () => void;
    getContent: () => string;
    setContent: (text: string) => void;
    clear: () => void;
    isEmpty: boolean;
}
/**
 * Creates reactive and imperative handles for controlling MessageEditor.
 *
 * `messageEditor` should be passed to MessageEditor component.
 * `controller` can be used by consumer to imperatively control and access the state of a child message editor component.
 *
 * @example
 * const { messageEditor, controller } = useMessageEditor({ onEditorFocus: scheduleStaleCheck });
 * controller.focus();
 * const content = controller.getContent();
 * if (controller.isEmpty) {
 *   // Submit button disabled
 * }
 *
 * <MessageEditor messageEditor={messageEditor} onSubmit={handleSubmit} />
 */
export declare const useMessageEditor: (options?: {
    onEditorFocus?: () => void;
}) => {
    messageEditor: MessageEditorInstance;
    controller: MessageEditorController;
};
