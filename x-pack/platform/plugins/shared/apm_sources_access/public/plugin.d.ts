import type { CoreStart } from '@kbn/core/public';
import type { Plugin } from '@kbn/core/public';
/**
 * APM Source setup services
 */
export type ApmSourceAccessPluginSetup = ReturnType<ApmSourceAccessPlugin['setup']>;
/**
 * APM Source start services
 */
export type ApmSourceAccessPluginStart = ReturnType<ApmSourceAccessPlugin['start']>;
export declare class ApmSourceAccessPlugin implements Plugin<ApmSourceAccessPluginSetup, ApmSourceAccessPluginStart, {}> {
    setup(): void;
    start(core: CoreStart): {
        getApmIndices: (options?: Omit<import("./api").SourcesApiOptions, "body">) => Promise<Readonly<{} & {
            error: string;
            span: string;
            transaction: string;
            metric: string;
            onboarding: string;
            sourcemap: string;
        }>>;
        getApmIndexSettings: (options?: Omit<import("./api").SourcesApiOptions, "body">) => Promise<import("../server/routes/settings").ApmIndexSettingsResponse>;
        saveApmIndices: (options: import("./api").SourcesApiOptions & {
            body: Partial<Record<keyof import(".").APMIndices, string>>;
        }) => Promise<import("@kbn/core/server").SavedObject<{}>>;
    };
    stop(): void;
}
