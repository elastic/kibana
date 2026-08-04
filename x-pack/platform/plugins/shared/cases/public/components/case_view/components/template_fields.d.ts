import React from 'react';
import type { CaseUI } from '../../../../common';
import type { OnUpdateFields } from '../types';
interface TemplateFieldsProps {
    caseData: CaseUI;
    onUpdateField: (args: OnUpdateFields) => void;
    /**
     * When false, skips the "Extended fields" heading (redesign accordion already labels the section).
     * Defaults to true for the legacy case view.
     */
    showHeader?: boolean;
}
export declare const TemplateFields: React.NamedExoticComponent<TemplateFieldsProps>;
export {};
