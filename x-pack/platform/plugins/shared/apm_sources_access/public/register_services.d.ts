import type { HttpStart } from '@kbn/core/public';
import { type SourcesApiOptions } from './api';
import type { APMIndices } from '../common/config_schema';
export interface RegisterServicesParams {
    http: HttpStart;
}
export declare function registerServices(params: RegisterServicesParams): {
    getApmIndices: (options?: Omit<SourcesApiOptions, "body">) => Promise<Readonly<{} & {
        error: string;
        span: string;
        transaction: string;
        metric: string;
        onboarding: string;
        sourcemap: string;
    }>>;
    getApmIndexSettings: (options?: Omit<SourcesApiOptions, "body">) => Promise<import("../server/routes/settings").ApmIndexSettingsResponse>;
    saveApmIndices: (options: SourcesApiOptions & {
        body: Partial<Record<keyof APMIndices, string>>;
    }) => Promise<import("@kbn/core/server").SavedObject<{}>>;
};
export declare function createApmSourcesAccessService({ http }: RegisterServicesParams): {
    getApmIndices: (options?: Omit<SourcesApiOptions, "body">) => Promise<Readonly<{} & {
        error: string;
        span: string;
        transaction: string;
        metric: string;
        onboarding: string;
        sourcemap: string;
    }>>;
    getApmIndexSettings: (options?: Omit<SourcesApiOptions, "body">) => Promise<import("../server/routes/settings").ApmIndexSettingsResponse>;
    saveApmIndices: (options: SourcesApiOptions & {
        body: Partial<Record<keyof APMIndices, string>>;
    }) => Promise<import("@kbn/core/server").SavedObject<{}>>;
};
