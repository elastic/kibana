import React from 'react';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import type { QualityIndicators } from '../../../../common/types';
interface QualitiesSelectorProps {
    isLoading: boolean;
    qualities: QualityItem[];
    onQualitiesChange: (qualities: QualityItem[]) => void;
}
export interface QualityItem {
    label: QualityIndicators;
    checked?: EuiSelectableOptionCheckedType;
}
export declare function QualitiesSelector({ isLoading, qualities, onQualitiesChange, }: QualitiesSelectorProps): React.JSX.Element;
export {};
