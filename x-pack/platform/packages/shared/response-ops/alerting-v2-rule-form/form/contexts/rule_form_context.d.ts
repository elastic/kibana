import type { PropsWithChildren } from 'react';
import React from 'react';
import type { ApplicationStart, HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
export interface RuleFormServices {
    http: HttpStart;
    data: DataPublicPluginStart;
    dataViews: DataViewsPublicPluginStart;
    notifications: NotificationsStart;
    application: ApplicationStart;
    lens: LensPublicStart;
}
export type RuleFormLayout = 'page' | 'flyout';
export interface RuleFormMeta {
    /** Whether the form is rendered on a full page or inside a flyout. */
    layout: RuleFormLayout;
}
/**
 * Provides services and metadata to all rule form descendants.
 *
 * `meta` defaults to `{ layout: 'page' }` when omitted.
 */
export declare const RuleFormProvider: ({ children, services, meta, }: PropsWithChildren<{
    services: RuleFormServices;
    meta?: RuleFormMeta;
}>) => React.JSX.Element;
/** Backward-compatible hook that returns only the services object. */
export declare const useRuleFormServices: () => RuleFormServices;
/** Returns the form metadata (layout, etc.). */
export declare const useRuleFormMeta: () => RuleFormMeta;
