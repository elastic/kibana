import type { CasesTourStep } from '../../../tour/types';
export declare const CASE_DETAILS_TOUR_STEP_TEST_ID = "cases-case-details-tour-step";
export interface CaseDetailsTourConditions {
    canCreateComment: boolean;
    canUpdate: boolean;
    /** Whether the current solution enables any case setting; gates the settings step. */
    hasCaseSettings: boolean;
    /** Whether the "Add to chat" action is available; gates the chat step. */
    isAddToChatAvailable: boolean;
    isTemplatesEnabled: boolean;
    isConnectorAuthorized: boolean;
}
/**
 * Builds the case-details tour steps, including only those whose target is actually rendered for
 * the current case/permissions/config. Steps whose anchor still isn't in the DOM when reached are
 * skipped by the tour engine's anchor guard (e.g. the connector section while it loads, or the
 * settings button when the header menu overflows on narrow viewports).
 *
 * TODO: add a "Legacy fields" step once the legacy-fields sidebar section lands (elastic/kibana#279460).
 */
export declare const getCaseDetailsTourSteps: ({ canCreateComment, canUpdate, hasCaseSettings, isAddToChatAvailable, isTemplatesEnabled, isConnectorAuthorized, }: CaseDetailsTourConditions) => CasesTourStep[];
