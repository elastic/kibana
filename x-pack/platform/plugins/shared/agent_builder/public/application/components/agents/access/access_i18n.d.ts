export declare const accessFlyoutTitle: (agentName: string) => string;
export declare const accessFlyoutSubtitle: (agentName: string) => string;
export declare const accessFlyoutCancel: string;
export declare const accessFlyoutSave: string;
/**
 * Default-access blurb shown in the banner above the form for each access control mode.
 *
 * Each message stitches together the agent's current access control mode with the
 * default behavior that mode implies, plus a reminder that ACL entries grant
 * additional access on top.
 */
export declare const accessControlModeContextMessage: (accessControlModeLabel: string) => {
    publicMessage: string;
    sharedMessage: string;
    privateMessage: string;
};
export declare const accessFlyoutPeopleSection: string;
export declare const accessFlyoutPeopleHelp: string;
export declare const accessFlyoutAddPeoplePlaceholder: string;
export declare const accessFlyoutNoPeople: string;
export declare const accessFlyoutRoleAriaLabel: string;
export declare const accessFlyoutRemoveAriaLabel: string;
export declare const accessFlyoutSaveErrorTitle: string;
export declare const accessFlyoutLoadErrorTitle: string;
export declare const accessFlyoutLoadErrorBody: string;
export declare const accessFlyoutHiddenTitle: string;
export declare const accessFlyoutHiddenBody: string;
export declare const accessSummaryCardTitle: string;
export declare const accessSummaryManageButton: string;
export declare const accessSummaryDefaultDescription: string;
export declare const accessSummaryHiddenDescription: string;
export declare const accessSummaryCount: (users: number) => string;
export declare const accessSummaryLoading: string;
export declare const accessFlyoutCustomBadge: string;
export declare const accessFlyoutCustomBadgeWithCount: (count: number) => string;
