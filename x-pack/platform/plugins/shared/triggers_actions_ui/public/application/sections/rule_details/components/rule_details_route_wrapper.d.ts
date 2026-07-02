import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
type RuleDetailsRouteWrapperProps = RouteComponentProps<{
    ruleId: string;
}>;
/**
 * Wrapper component for RuleDetailsRoute that provides KibanaPageTemplate layout.
 * This matches the layout structure provided by the management plugin wrapper.
 * Only used in the standalone rules page app (/app/rules), not in management plugin routes.
 */
declare const RuleDetailsRouteWrapper: React.FunctionComponent<RuleDetailsRouteWrapperProps>;
export default RuleDetailsRouteWrapper;
