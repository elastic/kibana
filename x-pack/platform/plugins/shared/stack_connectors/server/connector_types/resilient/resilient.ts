/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosError } from 'axios';
import { omitBy, isNil, isObject } from 'lodash/fp';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { CaseConnector, getBasicAuthHeader } from '@kbn/actions-plugin/server';
import { z } from '@kbn/zod';
import { getErrorMessage } from '@kbn/actions-plugin/server/lib/axios_utils';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type {
  CreateIncidentData,
  ExternalServiceIncidentResponse,
  GetIncidentResponse,
  GetIncidentTypesResponse,
  GetSeverityResponse,
  Incident,
  ResilientConfig,
  ResilientSecrets,
  UpdateIncidentParams,
  ResilientFieldMeta,
} from '@kbn/connector-schemas/resilient';
import {
  SUB_ACTION,
  ExecutorSubActionCommonFieldsParamsSchema,
  ExecutorSubActionGetIncidentTypesParamsSchema,
  ExecutorSubActionGetSeverityParamsSchema,
  GetCommonFieldsResponseSchema,
  GetIncidentTypesResponseSchema,
  GetSeverityResponseSchema,
  GetIncidentResponseSchema,
  CONNECTOR_NAME,
} from '@kbn/connector-schemas/resilient';
import * as i18n from './translations';
import { formatUpdateRequest, prepareAdditionalFieldsForCreation } from './utils';

const VIEW_INCIDENT_URL = `#incidents`;

export class ResilientConnector extends CaseConnector<
  ResilientConfig,
  ResilientSecrets,
  Incident,
  GetIncidentResponse
> {
  private urls: {
    incidentTypes: string;
    incident: string;
    comment: string;
    severity: string;
  };

  constructor(
    params: ServiceParams<ResilientConfig, ResilientSecrets>,
    pushToServiceParamsExtendedSchema: Record<string, z.ZodType<unknown>>
  ) {
    super(params, pushToServiceParamsExtendedSchema);

    this.urls = {
      incidentTypes: `${this.getIncidentFieldsUrl()}/incident_type_ids`,
      incident: `${this.getOrgUrl()}/incidents`,
      comment: `${this.getOrgUrl()}/incidents/{inc_id}/comments`,
      severity: `${this.getIncidentFieldsUrl()}/severity_code`,
    };

    this.registerSubActions();
  }

  protected getResponseErrorMessage(error: AxiosError) {
    if (!error.response?.status) {
      return i18n.UNKNOWN_API_ERROR;
    }
    if (error.response.status === 401) {
      return i18n.UNAUTHORIZED_API_ERROR;
    }
    if (isObject(error.response?.data) && 'message' in error.response.data) {
      return `API Error: ${error.response.data.message}`;
    }
    return `API Error: ${error.response?.statusText}`;
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.INCIDENT_TYPES,
      method: 'getIncidentTypes',
      schema: ExecutorSubActionGetIncidentTypesParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.SEVERITY,
      method: 'getSeverity',
      schema: ExecutorSubActionGetSeverityParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.FIELDS,
      method: 'getFields',
      schema: ExecutorSubActionCommonFieldsParamsSchema,
    });
  }

  private getAuthHeaders() {
    return getBasicAuthHeader({
      username: this.secrets.apiKeyId,
      password: this.secrets.apiKeySecret,
    });
  }

  private getOrgUrl() {
    const { apiUrl: url, orgId } = this.config;

    return `${url}/rest/orgs/${orgId}`;
  }

  private getIncidentFieldsUrl = () => `${this.getOrgUrl()}/types/incident/fields`;

  private getIncidentViewURL(key: string) {
    const url = this.config.apiUrl;
    const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;

    return `${urlWithoutTrailingSlash}/${VIEW_INCIDENT_URL}/${key}`;
  }

  public async createIncident(
    incident: Incident,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<ExternalServiceIncidentResponse> {
    try {
      let data: CreateIncidentData = {
        name: incident.name,
        discovered_date: Date.now(),
      };

      if (incident?.description) {
        data = {
          ...data,
          description: {
            format: 'html',
            content: incident.description ?? '',
          },
        };
      }

      if (incident?.incidentTypes) {
        data = {
          ...data,
          incident_type_ids: incident.incidentTypes.map((id: number | string) => ({
            id: Number(id),
          })),
        };
      }

      if (incident?.severityCode) {
        data = {
          ...data,
          severity_code: { id: Number(incident.severityCode) },
        };
      }

      if (incident.additionalFields) {
        const fieldsMetaData = await this.getFields({}, connectorUsageCollector);
        const { properties, ...rest } = prepareAdditionalFieldsForCreation(
          fieldsMetaData,
          incident.additionalFields
        );
        data = { ...data, ...(rest ? rest : {}), ...(properties ? { properties } : {}) };
      }

      const res = await this.request(
        {
          url: `${this.urls.incident}?text_content_output_format=objects_convert`,
          method: 'POST',
          data,
          headers: this.getAuthHeaders(),
          responseSchema: z
            .object({
              id: z.coerce.number(),
              create_date: z.coerce.number(),
            })
            .passthrough(),
        },
        connectorUsageCollector
      );

      const { id, create_date: createDate } = res.data;

      return {
        title: `${id}`,
        id: `${id}`,
        pushedDate: new Date(createDate).toISOString(),
        url: this.getIncidentViewURL(id.toString()),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(CONNECTOR_NAME, `Unable to create incident. Error: ${error.message}.`)
      );
    }
  }

  public async updateIncident(
    { incidentId, incident }: UpdateIncidentParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<ExternalServiceIncidentResponse> {
    try {
      const latestIncident = await this.getIncident({ id: incidentId }, connectorUsageCollector);
      const fields = await this.getFields({}, connectorUsageCollector);

      // Remove null or undefined values. Allowing null values sets the field in IBM Resilient to empty.
      const newIncident = omitBy(isNil, incident);
      const data = formatUpdateRequest({
        oldIncident: latestIncident,
        newIncident,
        fields,
      });

      const res = await this.request(
        {
          method: 'PATCH',
          url: `${this.urls.incident}/${incidentId}`,
          data,
          headers: this.getAuthHeaders(),
          responseSchema: z
            .object({ success: z.boolean(), message: z.string().nullable().default(null) })
            .passthrough(),
        },
        connectorUsageCollector
      );

      if (!res.data.success) {
        throw new Error(`Error while updating incident: ${res.data.message}`);
      }

      const updatedIncident = await this.getIncident({ id: incidentId }, connectorUsageCollector);

      return {
        title: `${updatedIncident.id}`,
        id: `${updatedIncident.id}`,
        pushedDate: new Date(updatedIncident.inc_last_modified_date).toISOString(),
        url: this.getIncidentViewURL(updatedIncident.id.toString()),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          CONNECTOR_NAME,
          `Unable to update incident with id ${incidentId}. Error: ${error.message}.`
        )
      );
    }
  }

  public async addComment(
    { incidentId, comment }: { incidentId: string; comment: string },
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    try {
      await this.request(
        {
          method: 'POST',
          url: this.urls.comment.replace('{inc_id}', incidentId),
          data: { text: { format: 'text', content: comment } },
          headers: this.getAuthHeaders(),
          responseSchema: z.object({}).passthrough(),
        },
        connectorUsageCollector
      );
    } catch (error) {
      throw new Error(
        getErrorMessage(
          CONNECTOR_NAME,
          `Unable to create comment at incident with id ${incidentId}. Error: ${error.message}.`
        )
      );
    }
  }

  public async getIncident(
    { id }: { id: string },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<GetIncidentResponse> {
    try {
      const res = await this.request(
        {
          method: 'GET',
          url: `${this.urls.incident}/${id}`,
          params: {
            text_content_output_format: 'objects_convert',
          },
          headers: this.getAuthHeaders(),
          responseSchema: GetIncidentResponseSchema,
        },
        connectorUsageCollector
      );

      return res.data;
    } catch (error) {
      throw new Error(
        getErrorMessage(
          CONNECTOR_NAME,
          `Unable to get incident with id ${id}. Error: ${error.message}.`
        )
      );
    }
  }

  public async getIncidentTypes(
    params: unknown,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<GetIncidentTypesResponse> {
    try {
      const res = await this.request(
        {
          method: 'GET',
          url: this.urls.incidentTypes,
          headers: this.getAuthHeaders(),
          responseSchema: GetIncidentTypesResponseSchema,
        },
        connectorUsageCollector
      );

      const incidentTypes = res.data?.values ?? [];

      return incidentTypes.map((type: { value: number; label: string }) => ({
        id: type.value.toString(),
        name: type.label,
      }));
    } catch (error) {
      throw new Error(
        getErrorMessage(CONNECTOR_NAME, `Unable to get incident types. Error: ${error.message}.`)
      );
    }
  }

  public async getSeverity(
    params: unknown,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<GetSeverityResponse> {
    try {
      const res = await this.request(
        {
          method: 'GET',
          url: this.urls.severity,
          headers: this.getAuthHeaders(),
          responseSchema: GetSeverityResponseSchema,
        },
        connectorUsageCollector
      );

      const severities = res.data?.values ?? [];
      return severities.map((type: { value: number; label: string }) => ({
        id: type.value.toString(),
        name: type.label,
      }));
    } catch (error) {
      throw new Error(
        getErrorMessage(CONNECTOR_NAME, `Unable to get severity. Error: ${error.message}.`)
      );
    }
  }

  public async getFields(
    params: unknown,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<ResilientFieldMeta[]> {
    try {
      const res = await this.request(
        {
          method: 'GET',
          url: this.getIncidentFieldsUrl(),
          headers: this.getAuthHeaders(),
          responseSchema: GetCommonFieldsResponseSchema,
        },
        connectorUsageCollector
      );

      const fields = res.data.map((field) => {
        return {
          name: field.name,
          input_type: field.input_type,
          read_only: field.read_only,
          required: field.required,
          text: field.text,
          prefix: field.prefix,
          values: field.values,
        };
      });

      return fields;
    } catch (error) {
      throw new Error(
        getErrorMessage(CONNECTOR_NAME, `Unable to get fields. Error: ${error.message}.`)
      );
    }
  }
}
