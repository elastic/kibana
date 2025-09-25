/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isObject } from 'lodash';
import type { GetValueTextContentResponse, UpdateIncidentRequest } from './types';

export const getValueTextContent = (
  field: string,
  value: string | number | number[] | undefined
): GetValueTextContentResponse => {
  if (value == null || value === undefined) {
    return { text: '' };
  }

  if (field === 'description') {
    return {
      textarea: {
        format: 'html',
        content: value.toString(),
      },
    };
  }

  if (field === 'incidentTypes') {
    if (isArray(value)) {
      return { ids: value.map((item) => Number(item)) };
    }
    return {
      ids: [Number(value)],
    };
  }

  if (field === 'severityCode') {
    return {
      id: Number(value),
    };
  }

  return {
    text: value.toString(),
  };
};

function additionalFieldsAreSpecified(
  additionalFields: unknown
): additionalFields is Record<string, unknown> {
  return isObject(additionalFields) && Object.keys(additionalFields).length > 0;
}

export const formatUpdateRequest = ({
  oldIncident,
  newIncident,
}: {
  oldIncident: Record<string, unknown>;
  newIncident: Record<string, unknown>;
}): UpdateIncidentRequest => {
  const { additionalFields, ...updates } = newIncident;

  // `additionalFields` need to be treated differently as they are dynamic and not part of the standard fields
  // In the update request, we do not need to add them under `properties`. They're added at the top level.
  // We only need to make sure we merge them correctly with the old incident properties.
  let mergedAdditionalFields: UpdateIncidentRequest['changes'] = [];
  if (additionalFieldsAreSpecified(additionalFields)) {
    mergedAdditionalFields = Object.keys(additionalFields)
      .map((key) => {
        if (additionalFields[key]) {
          return {
            field: { name: key },
            old_value:
              oldIncident.properties && isObject(oldIncident.properties)
                ? (oldIncident.properties as Record<string, unknown>)[key]
                : null,
            new_value: additionalFields[key] ?? null,
          };
        }
      })
      .filter(Boolean) as UpdateIncidentRequest['changes'];
  }
  return {
    changes: mergedAdditionalFields.concat(
      Object.keys(updates).map((key) => {
        let name = key;

        if (key === 'incidentTypes') {
          name = 'incident_type_ids';
        }

        if (key === 'severityCode') {
          name = 'severity_code';
        }

        return {
          field: { name },
          old_value: getValueTextContent(
            key,
            name === 'description'
              ? (oldIncident as { description: { content: string } }).description.content
              : (oldIncident[name] as string | number | number[])
          ),
          new_value: getValueTextContent(key, updates[key] as string | undefined),
        };
      })
    ),
  };
};
