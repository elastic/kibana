import type { api } from '@elastic/opentelemetry-node/sdk';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
export declare function isInferenceSpan(span: tracing.Span, parentContext: api.Context): boolean;
