import type { ExpressionRenderError } from '@kbn/expressions-plugin/public';
import type { UserMessage } from '@kbn/lens-common';
export declare function getOriginalRequestErrorMessages(error: ExpressionRenderError | null): UserMessage[];
