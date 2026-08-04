import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ContextSwitcherEnvironmentConfig } from '@kbn/context-switcher-components';
import type { CoreStart } from '@kbn/core/public';
export declare const useEnvironmentContext: ({ cloud, http, isServerless, }: {
    cloud?: CloudStart;
    http: CoreStart["http"];
    isServerless?: boolean;
}) => ContextSwitcherEnvironmentConfig | undefined;
