import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import type { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import type { IndexPatternMap, IndexPatternRef, UserMessage, VisualizationDisplayOptions, ExpressionWrapperProps, LensRuntimeState } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import { type MergedSearchContext } from './merged_search_context';
import type { LensEmbeddableStartServices } from '../types';
interface GetExpressionRendererPropsParams {
    searchContext: MergedSearchContext;
    disableTriggers?: boolean;
    renderMode?: RenderMode;
    settings: {
        syncColors?: boolean;
        syncCursor?: boolean;
        syncTooltips?: boolean;
    };
    services: LensEmbeddableStartServices;
    getExecutionContext: () => KibanaExecutionContext | undefined;
    searchSessionId?: string;
    abortController?: AbortController;
    onRender: (count: number) => void;
    handleEvent: (event: ExpressionRendererEvent) => void;
    onData: ExpressionWrapperProps['onData$'];
    logError: (type: 'runtime' | 'validation') => void;
    api: LensApi;
    addUserMessages: (messages: UserMessage[]) => void;
    updateBlockingErrors: (error: Error) => void;
    forceDSL?: boolean;
    getDisplayOptions: () => VisualizationDisplayOptions;
}
export declare function getExpressionRendererParams(state: LensRuntimeState, { settings: { syncColors, syncCursor, syncTooltips }, services, disableTriggers, getExecutionContext, searchSessionId, abortController, onRender, handleEvent, onData, logError, api, renderMode, addUserMessages, updateBlockingErrors, searchContext, forceDSL, getDisplayOptions, }: GetExpressionRendererPropsParams): Promise<{
    params: ExpressionWrapperProps | null;
    abortController?: AbortController;
    indexPatterns: IndexPatternMap;
    indexPatternRefs: IndexPatternRef[];
    activeVisualizationState?: unknown;
    activeDatasourceState?: unknown;
}>;
export {};
