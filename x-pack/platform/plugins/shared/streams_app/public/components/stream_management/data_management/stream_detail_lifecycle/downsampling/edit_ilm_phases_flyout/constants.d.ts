import type { PhaseName } from '@kbn/streams-schema';
import type { TimeUnit } from './form';
export { TIME_UNIT_OPTIONS } from '../shared';
export declare const ILM_PHASE_ORDER: PhaseName[];
export declare const READONLY_ALLOWED_PHASES: PhaseName[];
export declare const PHASE_LABELS: Record<PhaseName, string>;
export declare const DEFAULT_NEW_PHASE_MIN_AGE: {
    value: string;
    unit: TimeUnit;
};
export declare const PHASE_MOUNT_PATHS: Record<PhaseName, ReadonlyArray<string>>;
