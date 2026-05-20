import type { APMBaseDoc } from './apm_base_doc';
import type { TimestampUs } from './fields/timestamp_us';
export interface EventRaw extends APMBaseDoc {
    timestamp: TimestampUs;
    transaction?: {
        id: string;
        sampled?: boolean;
        type: string;
    };
    log: {
        message?: string;
    };
    event: {
        action: string;
        category: string;
    };
}
