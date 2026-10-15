import type { ScoutPage } from '@kbn/scout';
/**
 * Page object for the Anonymization Settings management page
 */
export declare class AnonymizationSettingsPage {
    private readonly page;
    constructor(page: ScoutPage);
    /**
     * Navigate to the Anonymization Settings page in Stack Management
     */
    navigateTo(): Promise<void>;
    /**
     * Wait for the page to finish loading
     */
    waitForPageToLoad(): Promise<void>;
    /**
     * Get the Anonymization Settings page title element
     */
    getPageTitle(): import("playwright-core").Locator;
    /**
     * Get the header "Masking enabled" master-switch element
     */
    getHeaderMaskingSwitch(): import("playwright-core").Locator;
    /**
     * Get the "Tech Preview" badge next to the page title
     */
    getTechPreviewBadge(): import("playwright-core").Locator;
    goToTab(tab: 'builtin' | 'custom' | 'tester' | 'settings'): Promise<void>;
    /**
     * Get the Built-in patterns table element
     */
    getBuiltInPatternsTable(): import("playwright-core").Locator;
    /**
     * Get the Custom patterns table element
     */
    getCustomPatternsTable(): import("playwright-core").Locator;
    /**
     * Get the "Add pattern" button on the Custom patterns tab
     */
    getAddPatternButton(): import("playwright-core").Locator;
    /**
     * Get the Add/Edit pattern flyout element
     */
    getPatternFlyout(): import("playwright-core").Locator;
    /**
     * Get the "Test pattern" button on the Pattern tester tab (or inside the flyout)
     */
    getTestPatternButton(): import("playwright-core").Locator;
    /**
     * Get the "Mask PII in AI requests" switch on the Settings tab
     */
    getSettingsMaskingEnabledSwitch(): import("playwright-core").Locator;
    /**
     * Get the on-failure radio group on the Settings tab
     */
    getOnFailureRadioGroup(): import("playwright-core").Locator;
}
