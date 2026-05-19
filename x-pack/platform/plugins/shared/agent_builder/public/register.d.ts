import type { AppDeepLink } from '@kbn/core-application-browser';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { AnalyticsServiceSetup, AppUpdater } from '@kbn/core/public';
import type { BehaviorSubject } from 'rxjs';
import type { AgentBuilderInternalService } from './services';
import type { AgentBuilderStartDependencies } from './types';
export declare const buildAgentBuilderDeepLinks: (experimentalFeaturesEnabled: boolean) => AppDeepLink[];
export declare const registerApp: ({ core, getServices, appUpdater$, }: {
    core: CoreSetup<AgentBuilderStartDependencies>;
    getServices: () => AgentBuilderInternalService;
    appUpdater$: BehaviorSubject<AppUpdater>;
}) => void;
export declare const registerAnalytics: ({ analytics }: {
    analytics: AnalyticsServiceSetup;
}) => void;
