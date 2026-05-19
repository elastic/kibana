import React, { type FC, type PropsWithChildren } from 'react';
import type { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { I18nStart, IUiSettingsClient, ThemeServiceStart, UserProfileService, NotificationsStart } from '@kbn/core/public';
import type { HttpStart } from '@kbn/core/public';
import type { CPSPluginStart } from '@kbn/cps/public/types';
/**
 * Date Picker Dependencies to be passed on via `DatePickerContextProvider`.
 */
export interface DatePickerDependencies {
    /**
     * data plugin
     */
    data: DataPublicPluginStart;
    /**
     * http service
     */
    http: HttpStart;
    /**
     * notifications service
     */
    notifications: NotificationsStart;
    /**
     * Kibana Security User Profile Service
     */
    userProfile: UserProfileService;
    /**
     * EUI theme
     */
    theme: ThemeServiceStart;
    /**
     * Kibana UI advanced settings
     */
    uiSettings: IUiSettingsClient;
    /**
     * Kibana UI advanced settings keys.
     */
    uiSettingsKeys: typeof UI_SETTINGS;
    /**
     * Internationalisation service
     */
    i18n: I18nStart;
    /**
     * Optional flag to disable the frozen data tier choice.
     */
    showFrozenDataTierChoice?: boolean;
    /**
     * CPS plugin for project routing
     */
    cps?: CPSPluginStart;
}
/**
 * The context holding the date picker dependencies.
 */
export declare const DatePickerContext: React.Context<DatePickerDependencies | undefined>;
/**
 * Custom hook to return date picker dependencies.
 * @returns `DatePickerDependencies`
 */
export declare const useDatePickerContext: () => DatePickerDependencies;
/**
 * React Component that acts as a wrapper for DatePickerContext.
 *
 * @type {FC<DatePickerDependencies>}
 * @param props - The component props
 * @returns {React.ReactElement} The DatePickerContextProvider component.
 */
export declare const DatePickerContextProvider: FC<PropsWithChildren<DatePickerDependencies>>;
