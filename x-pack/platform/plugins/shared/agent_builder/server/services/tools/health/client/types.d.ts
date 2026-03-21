import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ToolHealthStatus, ToolHealthState } from '../../../../../common/http_api/tools';
import type { ToolHealthProperties } from './storage';
export type ToolHealthDocument = SearchHit<ToolHealthProperties>;
export type { ToolHealthStatus, ToolHealthState };
export interface ToolHealthUpdateParams {
    status: ToolHealthStatus;
    lastCheck?: string;
    errorMessage?: string;
    consecutiveFailures?: number;
}
