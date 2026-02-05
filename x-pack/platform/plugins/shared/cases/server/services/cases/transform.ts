/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import { encodeHitVersion } from '@kbn/securitysolution-es-utils';
import { NONE_CONNECTOR_ID } from '../../../common/constants';
import type { Case, CaseCustomFields, ExternalService } from '../../../common/types/domain';
import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  SEVERITY_ESMODEL_TO_EXTERNAL,
  SEVERITY_EXTERNAL_TO_ESMODEL,
  STATUS_ESMODEL_TO_EXTERNAL,
  STATUS_EXTERNAL_TO_ESMODEL,
} from '../../common/constants';
import {
  findConnectorIdReference,
  transformFieldsToESModel,
  transformESConnectorOrUseDefault,
  transformESConnectorToExternalModel,
} from '../transform';
import { ConnectorReferenceHandler } from '../connector_reference_handler';
import type {
  CasePersistedAttributes,
  CaseTransformedAttributes,
  CaseTransformedAttributesWithAttachmentStats,
} from '../../common/types/case';
import type { ExternalServicePersisted } from '../../common/types/external_service';

export function transformUpdateResponseToExternalModel(
  updatedCase: SavedObjectsUpdateResponse<CasePersistedAttributes>
): SavedObjectsUpdateResponse<CaseTransformedAttributes> {
  const {
    connector,
    external_service,
    severity,
    status,
    total_alerts,
    total_comments,
    customFields,
    settings,
    ...restUpdateAttributes
  } =
    updatedCase.attributes ??
    ({
      total_alerts: -1,
      total_events: -1,
      total_comments: -1,
    } as CasePersistedAttributes);

  const transformedConnector = transformESConnectorToExternalModel({
    // if the saved object had an error the attributes field will not exist
    connector,
    references: updatedCase.references,
    referenceName: CONNECTOR_ID_REFERENCE_NAME,
  });

  let externalService: ExternalService | null | undefined;

  // if external_service is not defined then we don't want to include it in the response since it wasn't passed it as an
  // attribute to update
  if (external_service !== undefined) {
    externalService = transformESExternalService(external_service, updatedCase.references);
  }

  return {
    ...updatedCase,
    attributes: {
      ...restUpdateAttributes,
      ...((severity || severity === 0) && { severity: SEVERITY_ESMODEL_TO_EXTERNAL[severity] }),
      ...((status || status === 0) && { status: STATUS_ESMODEL_TO_EXTERNAL[status] }),
      ...(transformedConnector && { connector: transformedConnector }),
      // if externalService is null that means we intentionally updated it to null within ES so return that as a valid value
      ...(externalService !== undefined && { external_service: externalService }),
      ...(customFields !== undefined && {
        customFields: customFields as CaseTransformedAttributes['customFields'],
      }),
      ...(settings && {
        settings: {
          ...settings,
          extractObservables: settings.extractObservables ?? false,
        },
      }),
    },
  };
}

export function transformAttributesToESModel(caseAttributes: CaseTransformedAttributes): {
  attributes: CasePersistedAttributes;
  referenceHandler: ConnectorReferenceHandler;
};

export function transformAttributesToESModel(
  caseAttributes: Partial<CaseTransformedAttributesWithAttachmentStats>
): {
  attributes: Partial<CasePersistedAttributes>;
  referenceHandler: ConnectorReferenceHandler;
};

export function transformAttributesToESModel(caseAttributes: Partial<CaseTransformedAttributes>): {
  attributes: Partial<CasePersistedAttributes>;
  referenceHandler: ConnectorReferenceHandler;
} {
  const {
    connector,
    external_service,
    severity,
    status,
    incremental_id,
    settings,
    ...restAttributes
  } = caseAttributes;
  const { connector_id: pushConnectorId, ...restExternalService } = external_service ?? {};

  const transformedConnector = {
    ...(connector && {
      connector: {
        name: connector.name,
        type: connector.type,
        fields: transformFieldsToESModel(connector),
      },
    }),
  };

  const transformedExternalService = {
    ...(external_service
      ? { external_service: restExternalService }
      : external_service === null
      ? { external_service: null }
      : {}),
  };

  return {
    attributes: {
      ...restAttributes,
      ...transformedConnector,
      ...transformedExternalService,
      ...(severity && { severity: SEVERITY_EXTERNAL_TO_ESMODEL[severity] }),
      ...(status && { status: STATUS_EXTERNAL_TO_ESMODEL[status] }),
      ...(settings && {
        settings: {
          ...settings,
          extractObservables: settings.extractObservables ?? false,
        },
      }),
      total_observables: restAttributes.observables?.length ?? 0,
    },
    referenceHandler: buildReferenceHandler(connector?.id, pushConnectorId),
  };
}

export function transformESModelToCase(
  caseId: string,
  caseData: CasePersistedAttributes,
  hit: estypes.SearchHit
): Case {
  const sourceWithRefs = hit._source as { references?: SavedObjectReference[] } | undefined;
  const references = sourceWithRefs?.references;

  const connector = transformESConnectorOrUseDefault({
    connector: caseData.connector,
    references,
    referenceName: CONNECTOR_ID_REFERENCE_NAME,
  });

  const externalService = transformESExternalService(caseData.external_service, references);

  const { total_alerts, total_comments, total_events, ...caseAttributes } = caseData;

  const severity = SEVERITY_ESMODEL_TO_EXTERNAL[caseAttributes.severity] ?? CaseSeverity.LOW;
  const status = STATUS_ESMODEL_TO_EXTERNAL[caseAttributes.status] ?? CaseStatuses.open;
  const category = !caseAttributes.category ? null : caseAttributes.category;
  const customFields = !caseAttributes.customFields
    ? []
    : (caseAttributes.customFields as CaseCustomFields);
  const observables = caseAttributes.observables ?? [];
  const total_observables = observables.length;
  const incremental_id = caseAttributes.incremental_id ?? undefined;
  const settings = {
    syncAlerts: caseAttributes.settings?.syncAlerts ?? false,
    extractObservables: caseAttributes.settings?.extractObservables ?? false,
  };

  const version = encodeHitVersion(hit);

  return {
    id: caseId,
    version: version ?? '0',
    totalComment: total_comments ?? 0,
    totalAlerts: total_alerts ?? 0,
    totalEvents: total_events ?? 0,
    ...caseAttributes,
    severity,
    status,
    connector,
    external_service: externalService,
    category,
    customFields,
    observables,
    total_observables,
    incremental_id,
    settings,
    comments: [],
  };
}

function buildReferenceHandler(
  connectorId?: string,
  pushConnectorId?: string | null
): ConnectorReferenceHandler {
  return new ConnectorReferenceHandler([
    { id: connectorId, name: CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
    { id: pushConnectorId, name: PUSH_CONNECTOR_ID_REFERENCE_NAME, type: ACTION_SAVED_OBJECT_TYPE },
  ]);
}

export function transformFindResponseToExternalModel(
  response: SavedObjectsFindResponse<CasePersistedAttributes>
): SavedObjectsFindResponse<CaseTransformedAttributes> {
  return {
    ...response,
    saved_objects: response.saved_objects.map((so) => ({
      ...so,
      ...transformSavedObjectToExternalModel(so),
    })),
  };
}

export function transformSavedObjectToExternalModel(
  caseSavedObject: SavedObject<CasePersistedAttributes>
): SavedObject<CaseTransformedAttributes> {
  const connector = transformESConnectorOrUseDefault({
    // if the saved object had an error the attributes field will not exist
    connector: caseSavedObject.attributes?.connector,
    references: caseSavedObject.references,
    referenceName: CONNECTOR_ID_REFERENCE_NAME,
  });

  const externalService = transformESExternalService(
    caseSavedObject.attributes?.external_service,
    caseSavedObject.references
  );

  const { total_alerts, total_comments, ...caseSavedObjectAttributes } =
    caseSavedObject.attributes ??
    ({
      total_alerts: -1,
      total_events: -1,
      total_comments: -1,
    } as CasePersistedAttributes);

  const severity =
    SEVERITY_ESMODEL_TO_EXTERNAL[caseSavedObjectAttributes.severity] ?? CaseSeverity.LOW;
  const status = STATUS_ESMODEL_TO_EXTERNAL[caseSavedObjectAttributes.status] ?? CaseStatuses.open;
  const category = !caseSavedObjectAttributes.category ? null : caseSavedObjectAttributes.category;
  const customFields = !caseSavedObjectAttributes.customFields
    ? []
    : (caseSavedObjectAttributes.customFields as CaseCustomFields);
  const observables = caseSavedObjectAttributes.observables ?? [];
  const total_observables = observables.length;
  const incremental_id = caseSavedObjectAttributes.incremental_id ?? undefined;
  const settings = {
    syncAlerts: caseSavedObjectAttributes.settings?.syncAlerts ?? false,
    extractObservables: caseSavedObjectAttributes.settings?.extractObservables ?? false,
  };

  return {
    ...caseSavedObject,
    attributes: {
      ...caseSavedObjectAttributes,
      severity,
      status,
      connector,
      external_service: externalService,
      category,
      customFields,
      observables,
      total_observables,
      incremental_id,
      settings,
    },
  };
}

function transformESExternalService(
  // this type needs to match that of CaseFullExternalService except that it does not include the connector_id, see: x-pack/platform/plugins/shared/cases/common/api/cases/case.ts
  // that's why it can be null here
  externalService: ExternalServicePersisted | null | undefined,
  references: SavedObjectReference[] | undefined
): ExternalService | null {
  const connectorIdRef = findConnectorIdReference(PUSH_CONNECTOR_ID_REFERENCE_NAME, references);

  if (!externalService) {
    return null;
  }

  return {
    ...externalService,
    connector_id: connectorIdRef?.id ?? NONE_CONNECTOR_ID,
  };
}
