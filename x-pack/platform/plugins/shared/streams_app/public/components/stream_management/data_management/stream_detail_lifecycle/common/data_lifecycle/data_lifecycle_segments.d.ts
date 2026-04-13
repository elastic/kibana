import type { EuiFlexItemProps } from '@elastic/eui';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
interface BaseLifecycleSegment {
    grow: EuiFlexItemProps['grow'];
    isDelete?: boolean;
}
export interface TimelineSegment extends BaseLifecycleSegment {
    leftValue?: string;
}
export interface DownsamplingSegment extends BaseLifecycleSegment {
    step?: DownsampleStep;
    stepIndex?: number;
    phaseName?: string;
}
export interface SegmentPhase extends BaseLifecycleSegment {
    min_age?: string;
    downsample?: DownsampleStep;
    label?: string;
}
export declare const buildPhaseTimelineSegments: (phases: SegmentPhase[]) => TimelineSegment[];
export declare const buildDslSegments: (phases: SegmentPhase[], downsampleSteps: DownsampleStep[]) => {
    timelineSegments: TimelineSegment[];
    downsamplingSegments: DownsamplingSegment[];
};
export declare const buildIlmDownsamplingSegments: (phases: SegmentPhase[]) => DownsamplingSegment[] | null;
export declare const getGridTemplateColumns: (segments: TimelineSegment[]) => string;
export declare const getPhaseColumnSpans: (phases: SegmentPhase[], segments: TimelineSegment[]) => number[];
export declare const buildDownsamplingSegments: (phases: SegmentPhase[], dslSegments: ReturnType<typeof buildDslSegments> | null) => DownsamplingSegment[] | null;
export {};
