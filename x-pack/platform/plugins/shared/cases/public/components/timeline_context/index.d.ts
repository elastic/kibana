import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { EuiMarkdownAstNodePosition, EuiMarkdownEditorUiPlugin } from '@elastic/eui';
import type { Plugin } from 'unified';
/**
 * @description - manage the plugins, hooks, and ui components needed to enable timeline functionality within the cases plugin
 * @TODO - To better encapsulate the timeline logic needed by cases, we are managing it in this top level context.
 * This helps us avoid any prop drilling and makes it much easier later on to remove this logic when timeline becomes it's own plugin.
 */
interface UseInsertTimelineReturn {
    handleOnTimelineChange: (title: string, id: string | null) => void;
}
interface TimelineProcessingPluginRendererProps {
    id: string | null;
    title: string;
    type: 'timeline';
    [key: string]: string | null | undefined;
}
export interface CasesTimelineIntegration {
    editor_plugins: {
        parsingPlugin: Plugin;
        processingPluginRenderer: React.FC<TimelineProcessingPluginRendererProps & {
            position: EuiMarkdownAstNodePosition;
        }>;
        uiPlugin: EuiMarkdownEditorUiPlugin;
    };
    hooks: {
        useInsertTimeline: (value: string, onChange: (newValue: string) => void) => UseInsertTimelineReturn;
    };
}
export declare const CasesTimelineIntegrationContext: React.Context<CasesTimelineIntegration | null>;
export declare const CasesTimelineIntegrationProvider: FC<PropsWithChildren<{
    timelineIntegration?: CasesTimelineIntegration;
}>>;
export {};
