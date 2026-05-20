import type { RuleTypeParams } from '@kbn/alerting-plugin/common';
import type { Query } from '@kbn/es-query';
export interface GeoContainmentAlertParams extends RuleTypeParams {
    index: string;
    indexId: string;
    geoField: string;
    entity: string;
    dateField: string;
    boundaryType: string;
    boundaryIndexTitle: string;
    boundaryIndexId: string;
    boundaryGeoField: string;
    boundaryNameField?: string;
    indexQuery?: Query;
    boundaryIndexQuery?: Query;
}
