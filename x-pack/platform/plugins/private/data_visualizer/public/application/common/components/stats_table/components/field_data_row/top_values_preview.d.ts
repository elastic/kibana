import type { FC } from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
export interface TopValuesPreviewProps extends FieldDataRowProps {
    isNumeric?: boolean;
}
export declare const TopValuesPreview: FC<TopValuesPreviewProps>;
