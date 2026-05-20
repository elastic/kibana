import React from 'react';
import type { CaseUI } from '../../../common/ui/types';
export interface ExtendedFieldsColumnCellProps {
    extendedFields: CaseUI['extendedFields'];
    extendedFieldsLabels: CaseUI['extendedFieldsLabels'];
}
export declare const ExtendedFieldsColumnCell: React.FC<ExtendedFieldsColumnCellProps>;
