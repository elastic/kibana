import type { FC } from 'react';
import type { FieldStatsInitialState } from '../../../../../common/embeddables/types';
type FieldStatsInitializerInput = FieldStatsInitialState & {
    title?: string;
};
export interface FieldStatsInitializerProps {
    initialInput?: FieldStatsInitializerInput;
    onCreate: (props: FieldStatsInitialState) => Promise<void>;
    onCancel: () => void;
    onPreview: (update: Partial<FieldStatsInitialState>) => Promise<void>;
    isNewPanel: boolean;
}
export declare const FieldStatisticsInitializer: FC<FieldStatsInitializerProps>;
export {};
