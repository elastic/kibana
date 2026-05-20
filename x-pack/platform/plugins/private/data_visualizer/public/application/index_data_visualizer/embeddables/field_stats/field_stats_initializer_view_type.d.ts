import type { FC } from 'react';
import type { FieldStatsInitializerViewType } from '../grid_embeddable/types';
export interface ViewTypeSelectorProps {
    value: FieldStatsInitializerViewType;
    onChange: (update: FieldStatsInitializerViewType) => void;
}
export declare const DataSourceTypeSelector: FC<ViewTypeSelectorProps>;
