import type { FC } from 'react';
import { FieldStatsInitializerViewType } from '../../../../../common/embeddables/types';
export interface ViewTypeSelectorProps {
    value: FieldStatsInitializerViewType;
    onChange: (update: FieldStatsInitializerViewType) => void;
}
export declare const DataSourceTypeSelector: FC<ViewTypeSelectorProps>;
