import * as t from 'io-ts';
import type { IntegrationType } from '../../../common/api_types';
export declare const integrationsRouteRepository: {
    "GET /internal/dataset_quality/integrations/{integration}/dashboards": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/integrations/{integration}/dashboards", t.TypeC<{
        path: t.TypeC<{
            integration: t.StringC;
        }>;
    }>, import("../types").DatasetQualityRouteHandlerResources, {
        dashboards: {
            id: string;
            title: string;
        }[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
    "GET /internal/dataset_quality/integrations": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/dataset_quality/integrations", undefined, import("../types").DatasetQualityRouteHandlerResources, {
        integrations: IntegrationType[];
    }, import("../types").DatasetQualityRouteCreateOptions>;
};
