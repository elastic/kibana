import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import type { TimeRangeConfig } from '../../common/types';
import type { SendTelemetryFn } from './use_redirect_link_telemetry';
export declare const useEsqlRedirectLink: ({ esqlQuery, timeRangeConfig, sendTelemetry, }: {
    esqlQuery: string;
    timeRangeConfig: TimeRangeConfig;
    sendTelemetry: SendTelemetryFn;
}) => {
    linkProps: RouterLinkProps;
    navigate: () => void;
};
