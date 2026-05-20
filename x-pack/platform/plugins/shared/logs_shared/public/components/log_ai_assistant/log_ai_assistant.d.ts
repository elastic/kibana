import React from 'react';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { LogEntryField } from '../../../common';
export interface LogAIAssistantDocument {
    fields: LogEntryField[];
}
export interface LogAIAssistantProps {
    observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
    doc: LogAIAssistantDocument | undefined;
}
export declare const LogAIAssistant: ({ doc, observabilityAIAssistant: { ObservabilityAIAssistantContextualInsight, getContextualInsightMessages, }, }: LogAIAssistantProps) => React.JSX.Element | null;
export default LogAIAssistant;
