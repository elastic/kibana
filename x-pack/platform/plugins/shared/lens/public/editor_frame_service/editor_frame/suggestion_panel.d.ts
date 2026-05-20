import React from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { FramePublicAPI, UserMessagesGetter } from '@kbn/lens-common';
export interface SuggestionPanelProps {
    ExpressionRenderer: ReactExpressionRendererType;
    frame: FramePublicAPI;
    getUserMessages?: UserMessagesGetter;
    nowProvider: DataPublicPluginStart['nowProvider'];
    core: CoreStart;
    showOnlyIcons?: boolean;
    wrapSuggestions?: boolean;
    isAccordionOpen?: boolean;
    toggleAccordionCb?: (flag: boolean) => void;
}
export declare const SuggestionPanelWrapper: (props: SuggestionPanelProps) => React.JSX.Element | null;
export declare function SuggestionPanel({ frame, ExpressionRenderer: ExpressionRendererComponent, getUserMessages, nowProvider, core, showOnlyIcons, wrapSuggestions, toggleAccordionCb, isAccordionOpen, }: SuggestionPanelProps): React.JSX.Element | null;
