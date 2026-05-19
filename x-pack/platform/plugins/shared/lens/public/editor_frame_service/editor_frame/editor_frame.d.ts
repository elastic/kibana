import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import type { UserMessagesGetter, AddUserMessages, LensInspector } from '@kbn/lens-common';
import type { EditorFrameStartPlugins } from '../service';
import type { IndexPatternServiceAPI } from '../../data_views_service/service';
export interface EditorFrameProps {
    ExpressionRenderer: ReactExpressionRendererType;
    core: CoreStart;
    plugins: EditorFrameStartPlugins;
    showNoDataPopover: () => void;
    lensInspector: LensInspector;
    indexPatternService: IndexPatternServiceAPI;
    getUserMessages: UserMessagesGetter;
    addUserMessages: AddUserMessages;
}
export declare function EditorFrame(props: EditorFrameProps): React.JSX.Element;
