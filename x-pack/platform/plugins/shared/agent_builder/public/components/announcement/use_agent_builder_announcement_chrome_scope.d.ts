import type { CoreStart } from '@kbn/core/public';
/**
 * True when the user is in an Observability- or Security-oriented navigation context:
 * - Project / serverless: active chrome solution is `oblt` or `security`
 * - Classic: current app category is observability or security, or the Streams app (management category)
 */
export declare function useAgentBuilderAnnouncementChromeScope(core: CoreStart): boolean;
