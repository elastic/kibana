/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HttpSetup, IToasts } from '@kbn/core/public';
import {
  ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import {
  PerformBulkActionRequestBody,
  PerformBulkActionResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

export const bulkUpdateAnonymizationFields = async (
  http: HttpSetup,
  anonymizationFieldsActions: PerformBulkActionRequestBody,
  toasts?: IToasts
) => {
  try {
    const result = await http.fetch<PerformBulkActionResponse>(
      ELASTIC_AI_ASSISTANT_ANONYMIZATION_FIELDS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify(anonymizationFieldsActions),
      }
    );

    if (!result.success) {
      const serverError = result.attributes.errors
        ?.map(
          (e) =>
            `${e.status_code ? `Error code: ${e.status_code}. ` : ''}Error message: ${
              e.message
            } for anonymization field ${e.anonymization_fields.map((c) => c.name).join(',')}`
        )
        .join(',\n');
      throw new Error(serverError);
    }
    return result;
  } catch (error) {
    toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate(
        'xpack.elasticAssistant.anonymizationFields.bulkActionsAnonymizationFieldsError',
        {
          defaultMessage: 'Error updating anonymization fields {error}',
          values: { error },
        }
      ),
    });
  }
};
