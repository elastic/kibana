import type { EuiTourStepProps } from '@elastic/eui';
import type { StreamsTourStepId } from './constants';
export type TourStepConfig = Omit<EuiTourStepProps, 'children' | 'isStepOpen' | 'onFinish'> & {
    stepId: StreamsTourStepId;
};
export interface TourStepsOptions {
    attachmentsEnabled: boolean;
}
export declare function getTourStepsConfig(options: TourStepsOptions): TourStepConfig[];
