import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { NavigationSource, NavigationTarget } from '../services/telemetry';
export declare function useDatasetDetailsTelemetry(): {
    startTracking: () => void;
    trackDetailsNavigated: (target: NavigationTarget, source: NavigationSource, isDegraded?: boolean) => void;
    wrapLinkPropsForTelemetry: (props: RouterLinkProps, target: NavigationTarget, source: NavigationSource, isDegraded?: boolean) => {
        onClick: (event: Parameters<RouterLinkProps["onClick"]>[0]) => void;
        href: string | undefined;
    };
    navigationTargets: typeof NavigationTarget;
    navigationSources: typeof NavigationSource;
    trackDatasetDetailsBreakdownFieldChanged: () => void;
};
