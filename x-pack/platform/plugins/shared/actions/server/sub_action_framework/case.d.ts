import { z } from '@kbn/zod/v4';
import type { ExternalServiceIncidentResponse, PushToServiceResponse } from './types';
import { SubActionConnector } from './sub_action_connector';
import type { ServiceParams } from './types';
import type { ConnectorUsageCollector } from '../usage';
export interface CaseConnectorInterface<Incident, GetIncidentResponse> {
    addComment: ({ incidentId, comment }: {
        incidentId: string;
        comment: string;
    }, connectorUsageCollector: ConnectorUsageCollector) => Promise<void>;
    createIncident: (incident: Incident, connectorUsageCollector: ConnectorUsageCollector) => Promise<ExternalServiceIncidentResponse>;
    updateIncident: ({ incidentId, incident, }: {
        incidentId: string;
        incident: Incident;
    }, connectorUsageCollector: ConnectorUsageCollector) => Promise<ExternalServiceIncidentResponse>;
    getIncident: ({ id }: {
        id: string;
    }, connectorUsageCollector: ConnectorUsageCollector) => Promise<GetIncidentResponse>;
    pushToService: (params: {
        incident: {
            externalId: string | null;
        } & Incident;
        comments: Array<{
            commentId: string;
            comment: string;
        }>;
    }, connectorUsageCollector: ConnectorUsageCollector) => Promise<PushToServiceResponse>;
}
export declare abstract class CaseConnector<Config, Secrets, Incident, GetIncidentResponse> extends SubActionConnector<Config, Secrets> implements CaseConnectorInterface<Incident, GetIncidentResponse> {
    constructor(params: ServiceParams<Config, Secrets>, pushToServiceIncidentParamsSchema: Record<string, z.ZodType<unknown>>);
    abstract addComment({ incidentId, comment, }: {
        incidentId: string;
        comment: string;
    }, connectorUsageCollector: ConnectorUsageCollector): Promise<void>;
    abstract createIncident(incident: Incident, connectorUsageCollector: ConnectorUsageCollector): Promise<ExternalServiceIncidentResponse>;
    abstract updateIncident({ incidentId, incident, }: {
        incidentId: string;
        incident: Incident;
    }, connectorUsageCollector: ConnectorUsageCollector): Promise<ExternalServiceIncidentResponse>;
    abstract getIncident({ id }: {
        id: string;
    }, connectorUsageCollector: ConnectorUsageCollector): Promise<GetIncidentResponse>;
    pushToService(params: {
        incident: {
            externalId: string | null;
        } & Incident;
        comments: Array<{
            commentId: string;
            comment: string;
        }>;
    }, connectorUsageCollector: ConnectorUsageCollector): Promise<PushToServiceResponse>;
}
