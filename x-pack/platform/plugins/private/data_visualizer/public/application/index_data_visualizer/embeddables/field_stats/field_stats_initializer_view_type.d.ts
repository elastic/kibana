import type { FC } from 'react';
import { FieldStatsInitializerViewType } from '../grid_embeddable/types';
export interface ViewTypeSelectorProps {
    value: FieldStatsInitializerViewType;
    onChange: (update: FieldStatsInitializerViewType) => void;
}
export declare const DataSourceTypeSelector: FC<ViewTypeSelectorProps>;
