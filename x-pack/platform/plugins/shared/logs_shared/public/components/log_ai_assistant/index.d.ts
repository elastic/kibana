import React from 'react';
import type { ObservabilityLogsAIAssistantFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';
import type { LogAIAssistantProps } from './log_ai_assistant';
export declare const LogAIAssistant: React.ForwardRefExoticComponent<LogAIAssistantProps & React.RefAttributes<{}>>;
export declare function createLogAIAssistant({ observabilityAIAssistant, }: Pick<LogAIAssistantProps, 'observabilityAIAssistant'>): (props: Omit<LogAIAssistantProps, "observabilityAIAssistant">) => React.JSX.Element;
export declare const createLogsAIAssistantRenderer: (LogAIAssistantRender: ReturnType<typeof createLogAIAssistant>) => ({ doc }: ObservabilityLogsAIAssistantFeatureRenderDeps) => React.JSX.Element;
