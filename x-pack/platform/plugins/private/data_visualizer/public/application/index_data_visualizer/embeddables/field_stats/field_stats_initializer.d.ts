import type { FC } from 'react';
import type { FieldStatisticsTableEmbeddableState, FieldStatsInitialState } from '../grid_embeddable/types';
export interface FieldStatsInitializerProps {
    initialInput?: Partial<FieldStatisticsTableEmbeddableState>;
    onCreate: (props: FieldStatsInitialState) => Promise<void>;
    onCancel: () => void;
    onPreview: (update: Partial<FieldStatsInitialState>) => Promise<void>;
    isNewPanel: boolean;
}
export declare const FieldStatisticsInitializer: FC<FieldStatsInitializerProps>;
