import React from 'react';
import type { CaseUI } from '../../../../../common';
/**
 * Auto-firing guided tour for the redesigned case details page. Runs once per browser, then
 * persists a "seen" flag. Steps are built from the current permissions/config so only rendered
 * targets are included; the tour engine additionally skips any step whose anchor isn't in the DOM
 * when reached. Respects the global `hideAnnouncements` opt-out.
 */
interface CaseDetailsTourProps {
    caseData: CaseUI;
}
export declare const CaseDetailsTour: React.FC<CaseDetailsTourProps>;
export {};
