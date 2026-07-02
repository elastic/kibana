import React from 'react';
import type { EuiPageSectionProps } from '@elastic/eui';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
/**
 * @see https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/management/public/components/management_app/management_app.tsx#L125
 */
type KibanaPageTemplatePropsWithPadding = Omit<KibanaPageTemplateProps, 'mainProps'> & {
    mainProps?: EuiPageSectionProps;
};
type RulesPageTemplateProps = Omit<KibanaPageTemplatePropsWithPadding, 'restrictWidth' | 'panelled' | 'mainProps'> & {
    children: React.ReactNode;
    pageHeader?: KibanaPageTemplateProps['pageHeader'];
};
/**
 * Shared template wrapper for rules page app routes.
 * Provides consistent layout configuration matching the management plugin wrapper.
 * This ensures all routes in the standalone rules page app (/app/rules) have the same base layout.
 */
export declare const RulesPageTemplate: React.FunctionComponent<RulesPageTemplateProps>;
export {};
