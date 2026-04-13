import type { EuiFlexItemProps } from '@elastic/eui';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
interface BaseLifecyclePhase {
    color: string;
    docsCount?: number;
    description?: string;
    downsample?: DownsampleStep;
    grow: EuiFlexItemProps['grow'];
    isReadOnly?: boolean;
    isRemoveDisabled?: boolean;
    removeDisabledReason?: string;
    label: string;
    min_age?: string;
    name: string;
    searchableSnapshot?: string;
    sizeInBytes?: number;
    timelineValue?: string;
}
interface DeleteLifecyclePhase extends BaseLifecyclePhase {
    isDelete: true;
}
interface StandardLifecyclePhase extends BaseLifecyclePhase {
    isDelete?: false;
    size?: string;
}
export type LifecyclePhase = DeleteLifecyclePhase | StandardLifecyclePhase;
export declare function buildLifecyclePhases({ docsCount, label, color, deletePhaseColor, deletePhaseDescription, description, isReadOnly, retentionPeriod, size, sizeInBytes, }: {
    color: string;
    docsCount?: number;
    deletePhaseColor: string;
    deletePhaseDescription?: string;
    description?: string;
    isReadOnly?: boolean;
    label: string;
    retentionPeriod?: string;
    size?: string;
    sizeInBytes?: number;
}): LifecyclePhase[];
export {};
