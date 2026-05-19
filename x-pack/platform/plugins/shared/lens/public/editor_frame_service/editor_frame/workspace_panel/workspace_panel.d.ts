import React from 'react';
import { type UseEuiTheme } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionRendererEvent, ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import type { FramePublicAPI, Suggestion, UserMessage, UserMessagesGetter, AddUserMessages, VisualizationDisplayOptions, LensInspector } from '@kbn/lens-common';
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
export declare const WorkspacePanel: React.NamedExoticComponent<WorkspacePanelProps>;
export declare const InnerWorkspacePanel: React.NamedExoticComponent<Omit<WorkspacePanelProps, "getSuggestionForField"> & {
    suggestionForDraggedField: Suggestion | undefined;
}>;
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
    onData$: (data: unknown, adapters?: DefaultInspectorAdapters) => void;
    onComponentRendered: () => void;
    displayOptions: VisualizationDisplayOptions | undefined;
}) => React.JSX.Element;
export declare const promptIllustrationStyle: ({ euiTheme }: UseEuiTheme) => import("@emotion/react").SerializedStyles;
export declare const pageContentBodyStyles: ({ euiTheme }: UseEuiTheme) => import("@emotion/react").SerializedStyles;
export {};
