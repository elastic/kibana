import React from 'react';
import type { CaseUI } from '../../../../common';
import type { OnUpdateFields } from '../types';
interface TemplateFieldsProps {
    caseData: CaseUI;
    onUpdateField: (args: OnUpdateFields) => void;
}
export declare const TemplateFields: React.NamedExoticComponent<TemplateFieldsProps>;
export {};
