import React from 'react';
import type { RuleApiResponse } from '../services/rules_api';
interface UseComposeDiscoverFlyoutOptions {
    createSuccessRedirectPath?: string;
}
export declare const useComposeDiscoverFlyout: ({ createSuccessRedirectPath, }?: UseComposeDiscoverFlyoutOptions) => {
    flyout: React.JSX.Element | null;
    openCreateFlyout: () => void;
    openEditFlyout: (rule: RuleApiResponse) => void;
};
export {};
