import * as t from 'io-ts';
import { type ReturnOf, type EndpointOf, type ClientRequestParamsOf } from '@kbn/server-route-repository';
import type { SavedObject } from '@kbn/core/server';
import { type APMSourcesRouteHandlerResources } from './settings';
export type APMSourcesServerRouteRepository = typeof apmSourcesSettingsRouteRepository;
export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<APMSourcesServerRouteRepository, TEndpoint>;
export type APIEndpoint = EndpointOf<APMSourcesServerRouteRepository>;
export type APIClientRequestParamsOf<TEndpoint extends APIEndpoint> = ClientRequestParamsOf<APMSourcesServerRouteRepository, TEndpoint>;
export declare const apmSourcesSettingsRouteRepository: {
    "POST /internal/apm-sources/settings/apm-indices/save": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm-sources/settings/apm-indices/save", t.TypeC<{
        body: t.PartialC<{
            error: t.StringC;
            onboarding: t.StringC;
            span: t.StringC;
            transaction: t.StringC;
            metric: t.StringC;
            sourcemap: t.StringC;
        }>;
    }>, APMSourcesRouteHandlerResources, SavedObject<{}>, {}>;
    "GET /internal/apm-sources/settings/apm-index-settings": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm-sources/settings/apm-index-settings", undefined, APMSourcesRouteHandlerResources, import("./settings").ApmIndexSettingsResponse, {}>;
    "GET /internal/apm-sources/settings/apm-indices": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm-sources/settings/apm-indices", undefined, APMSourcesRouteHandlerResources, Readonly<{} & {
        error: string;
        span: string;
        transaction: string;
        metric: string;
        onboarding: string;
        sourcemap: string;
    }>, {}>;
};
