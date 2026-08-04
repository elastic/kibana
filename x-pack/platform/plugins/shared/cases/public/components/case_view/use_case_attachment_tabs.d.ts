import type { EuiThemeComputed } from '@elastic/eui';
import React from 'react';
import { type CaseUI } from '../../../common';
/**
 * Tab ids that resolve to the consolidated attachments view. Includes the
 * legacy per-type sub-tab ids so deep links from older URLs still work.
 */
export declare const ATTACHMENT_TAB_ALIASES: ReadonlySet<string>;
export declare const SimilarCasesBadge: {
    ({ activeTab, count, euiTheme, }: {
        activeTab: string;
        count?: number;
        euiTheme: EuiThemeComputed<{}>;
    }): React.JSX.Element;
    displayName: string;
};
export declare const AttachmentsBadge: {
    ({ isActive, count, euiTheme, }: {
        isActive: boolean;
        count?: number;
        euiTheme: EuiThemeComputed<{}>;
    }): React.JSX.Element;
    displayName: string;
};
/**
 * Computes the total count shown on the top-level "Attachments" tab badge.
 * Always the case-wide total (comments matching a registered type with a tab
 * view, plus files and — if licensed — observables). Deliberately ignores the
 * search term and filters so the badge stays a stable total.
 */
export declare const useCaseAttachmentsTotal: ({ caseData }: {
    caseData: CaseUI;
}) => number;
