import type { Plugin } from 'unified';
import type { TimeRange } from '@kbn/es-query';
export interface LensSerializerProps {
    attributes: Record<string, unknown>;
    timeRange: TimeRange;
}
export declare const LensSerializer: Plugin;
