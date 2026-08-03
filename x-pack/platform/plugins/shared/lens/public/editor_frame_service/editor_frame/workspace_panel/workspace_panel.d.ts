import React from 'react';
import { type UseEuiTheme } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionRendererEvent, ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import type { FramePublicAPI, Suggestion, UserMessage, UserMessagesGetter, AddUserMessages, VisualizationDisplayOptions, LensInspector } from '@kbn/lens-common';
import { type OnDataCallback } from '../../../react_embeddable/type_guards';
export interface WorkspacePanelProps {
    framePublicAPI: FramePublicAPI;
    ExpressionRenderer: ReactExpressionRendererType;
    core: CoreStart;
    plugins: {
        uiActions?: UiActionsStart;
        data: DataPublicPluginStart;
    };
    getSuggestionForField: (field: DragDropIdentifier) => Suggestion | undefined;
    lensInspector: LensInspector;
    getUserMessages: UserMessagesGetter;
    addUserMessages: AddUserMessages;
}
interface WorkspaceState {
    expressionToRender: string | null | undefined;
    errors: UserMessage[];
}
export declare const WorkspacePanel: React.MemoExoticComponent<(props: WorkspacePanelProps) => React.JSX.Element>;
export declare const InnerWorkspacePanel: React.MemoExoticComponent<({ framePublicAPI, core, plugins, ExpressionRenderer: ExpressionRendererComponent, suggestionForDraggedField, lensInspector, getUserMessages, addUserMessages, }: Omit<WorkspacePanelProps, "getSuggestionForField"> & {
    suggestionForDraggedField: Suggestion | undefined;
}) => React.JSX.Element>;
export declare const VisualizationWrapper: ({ expression, lensInspector, onEvent, hasCompatibleActions, setLocalState, localState, errors, ExpressionRendererComponent, core, onRender$, onData$, onComponentRendered, displayOptions, }: {
    expression: string | null | undefined;
    lensInspector: LensInspector;
    onEvent: (event: ExpressionRendererEvent) => void;
    hasCompatibleActions: (event: ExpressionRendererEvent) => Promise<boolean>;
    setLocalState: (dispatch: (prevState: WorkspaceState) => WorkspaceState) => void;
    localState: WorkspaceState;
    errors: UserMessage[];
    ExpressionRendererComponent: ReactExpressionRendererType;
    core: CoreStart;
    onRender$: () => void;
    onData$: OnDataCallback;
    onComponentRendered: () => void;
    displayOptions: VisualizationDisplayOptions | undefined;
}) => React.JSX.Element;
export declare const promptIllustrationStyle: ({ euiTheme }: UseEuiTheme) => import("@emotion/utils").SerializedStyles;
export declare const pageContentBodyStyles: ({ euiTheme }: UseEuiTheme) => import("@emotion/utils").SerializedStyles;
export {};
