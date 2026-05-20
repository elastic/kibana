import type { FC } from 'react';
import React from 'react';
import type { FieldSelectionItem } from '@kbn/ml-data-frame-analytics-utils';
export declare const AnalysisFieldsTable: FC<{
    dependentVariable?: string;
    includes: string[];
    isJobTypeWithDepVar: boolean;
    setFormState: React.Dispatch<React.SetStateAction<any>>;
    minimumFieldsRequiredMessage?: string;
    setMinimumFieldsRequiredMessage: React.Dispatch<React.SetStateAction<any>>;
    tableItems: FieldSelectionItem[];
    unsupportedFieldsError?: string;
    setUnsupportedFieldsError: React.Dispatch<React.SetStateAction<any>>;
}>;
