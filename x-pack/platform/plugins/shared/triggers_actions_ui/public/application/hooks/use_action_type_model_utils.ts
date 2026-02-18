/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import type { IconType } from '@elastic/eui';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import {
  fromConnectorSpecSchema,
  getMeta,
  setMeta,
  addMeta,
} from '@kbn/connector-specs';
import { generateFormFields } from '@kbn/response-ops-form-generator';
import type { ActionTypeModel } from '../../types';

/** Response from GET /api/actions/connector_types/{id}/spec */
export interface ConnectorSpecResponse {
  metadata: {
    id: string;
    displayName: string;
    description: string;
    icon?: string;
    minimumLicense: string;
    supportedFeatureIds: string[];
  };
  schema: Record<string, unknown>;
}

/**
 * Fetches a connector spec from the API.
 */
export async function fetchConnectorSpec(
  http: HttpSetup,
  connectorTypeId: string,
  signal?: AbortSignal
): Promise<ConnectorSpecResponse> {
  return http.get<ConnectorSpecResponse>(
    `/internal/actions/connector_types/${encodeURIComponent(connectorTypeId)}/spec`,
    { signal }
  );
}

/**
 * Resolves the icon for a connector based on the spec metadata.
 */
function getIconFromSpec(spec: ConnectorSpecResponse): IconType {
  if (spec.metadata.icon) {
    return spec.metadata.icon;
  }

  const lazyIcon = ConnectorIconsMap.get(spec.metadata.id);
  if (lazyIcon) {
    return lazyIcon;
  }

  return 'plugs';
}

/**
 * Transforms a ConnectorSpecResponse into an ActionTypeModel.
 *
 * This creates a model that can be used by the connector form components,
 * with dynamically generated form fields from the JSON schema.
 */
export function transformSpecToActionTypeModel(spec: ConnectorSpecResponse): ActionTypeModel {
  return {
    id: spec.metadata.id,
    actionTypeTitle: spec.metadata.displayName,
    source: ACTION_TYPE_SOURCES.spec,
    selectMessage: spec.metadata.description,
    iconClass: getIconFromSpec(spec),
    subtype: undefined,
    isExperimental: false,
    actionConnectorFields: lazy(() => {
      const zodSchema = fromConnectorSpecSchema(spec.schema);
      return Promise.resolve({
        default: (props: { readOnly?: boolean; isEdit?: boolean }) => {
          if (!zodSchema) {
            return null;
          }
          return generateFormFields({
            schema: zodSchema,
            formConfig: { disabled: props.readOnly, isEdit: props.isEdit },
            metaFunctions: { getMeta, setMeta, addMeta },
          });
        },
      });
    }),
    actionParamsFields: lazy(() => Promise.resolve({ default: () => null })),
    validateParams: async () => ({ errors: {} }),
    connectorForm: {
      serializer: createConnectorFormSerializer(),
      deserializer: createConnectorFormDeserializer(),
    },
  };
}

/**
 * Copy secrets.authType to config.authType when saving the connector.
 * This ensures authType persists since secrets are stripped by the API.
 */
function createConnectorFormSerializer() {
  return (formData: Record<string, unknown>) => {
    const secrets = formData?.secrets as Record<string, unknown> | undefined;
    if (!secrets?.authType) {
      return formData;
    }

    const config = formData?.config as Record<string, unknown> | undefined;
    return {
      ...formData,
      config: { ...config, authType: secrets.authType },
    };
  };
}

/**
 * Copies config.authType to secrets.authType when loading the connector.
 * This allows the discriminated union widget to display the correct option on
 * connector edit.
 */
function createConnectorFormDeserializer() {
  return (apiData: Record<string, unknown>) => {
    const config = apiData?.config as Record<string, unknown> | undefined;
    const secrets = apiData?.secrets as Record<string, unknown> | undefined;

    if (!config?.authType || secrets?.authType) {
      return apiData;
    }

    return { ...apiData, secrets: { authType: config.authType } };
  };
}
