import type { CreateGapAutoFillSchedulerParams } from '../types';
import type { RawGapAutoFillSchedulerAttributesV1 } from '../../../../../../saved_objects/schemas/raw_gap_auto_fill_scheduler';
export declare const transformGapAutoFillSchedulerCreateParamToSavedObject: (params: CreateGapAutoFillSchedulerParams, { createdBy, createdAt, updatedAt, updatedBy, }: {
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
    updatedBy: string | null;
}) => RawGapAutoFillSchedulerAttributesV1;
