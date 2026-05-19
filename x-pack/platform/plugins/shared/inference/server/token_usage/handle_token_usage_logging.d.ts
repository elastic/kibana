import type { OperatorFunction } from 'rxjs';
import type { ChatCompletionEvent } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { TokenUsageLogger } from './token_usage_logger';
import type { TokenUsageContext } from './types';
export declare const handleTokenUsageLogging: ({ tokenUsageLogger, getContext, logger, isEnabled, }: {
    tokenUsageLogger: TokenUsageLogger;
    getContext: () => TokenUsageContext;
    logger: Logger;
    isEnabled?: () => Promise<boolean>;
}) => OperatorFunction<ChatCompletionEvent, ChatCompletionEvent>;
