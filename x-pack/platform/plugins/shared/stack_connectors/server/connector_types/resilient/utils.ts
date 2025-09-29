/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isNumber, isString, isBoolean, isObject } from 'lodash';
import type {
  ResilientUpdateFieldValue,
  ResilientTextAreaField,
  ResilientFieldPrimitives,
  UpdateIncidentRequest,
} from './types';
import type { ResilientFieldMeta } from './schema';

// todo:
//    1.1 - add support for `values` check in select/multiselect

const getValueFromOldField = (
  fieldMeta: ResilientFieldMeta,
  value: unknown
): ResilientFieldPrimitives => {
  switch (fieldMeta.input_type) {
    case 'textarea':
      return value === null || value === undefined
        ? null
        : (value as ResilientTextAreaField['textarea']);
    case 'multiselect':
    case 'select':
    case 'datetimepicker':
    case 'datepicker':
    case 'boolean':
    case 'number':
    case 'text':
      return value as ResilientFieldPrimitives;
    default:
      return null;
  }
};

function getValueFieldShape(
  fieldMeta: ResilientFieldMeta,
  value: ResilientFieldPrimitives,
  oldValue?: ResilientFieldPrimitives
): ResilientUpdateFieldValue {
  switch (fieldMeta.input_type) {
    case 'textarea':
      if (value === null || value === undefined) {
        return { textarea: null };
      } else if (typeof value === 'object' && 'format' in value && 'content' in value) {
        return {
          textarea: {
            ...value,
          },
        };
      } else {
        return {
          textarea: {
            format: isObject(oldValue) && 'format' in oldValue ? oldValue?.format : 'text',
            content: value,
          },
        };
      }

    case 'multiselect':
      if (isArray(value)) {
        return { ids: value.map((item) => item) };
      } else if (isNumber(value)) {
        return { ids: [value] };
      } else {
        return {};
      }
    case 'select':
      return isNumber(value) || isString(value) ? { id: value } : {};
    case 'datetimepicker':
    case 'datepicker':
      return isNumber(value) ? { date: value } : {};
    case 'boolean':
      return isBoolean(value) ? { boolean: value } : {};
    case 'number':
      return isNumber(value) ? { object: value } : {};
    case 'text':
      return isString(value) ? { text: value } : {};
    default:
      return {};
  }
}

export const formatUpdateRequest = ({
  oldIncident,
  newIncident,
  fields,
}: {
  oldIncident: Record<string, unknown>;
  newIncident: Record<string, unknown>;
  fields: ResilientFieldMeta[];
}): UpdateIncidentRequest => {
  const { additionalFields, ...root } = newIncident;
  // We can merge the root and the additional fields since they are treated the same
  // in update requests to Resilient
  const updates: Record<string, unknown> = { ...(additionalFields || {}), ...root };
  const fieldsRecord = transformFieldMetadataToRecord(fields);
  return {
    changes: Object.keys(updates).map((key) => {
      let name = key;

      if (key === 'incidentTypes') {
        name = 'incident_type_ids';
      }

      if (key === 'severityCode') {
        name = 'severity_code';
      }

      const fieldMeta = fieldsRecord[name];
      if (!fieldMeta) {
        // if we don't have metadata about the field, we can't process it
        throw new Error(`No metadata found for field ${name}`);
      }

      let oldValue = oldIncident[name] ? oldIncident[name] : oldIncident[key];
      // Non-internal fields are stored under `properties` in the old incident
      if (!fieldMeta.internal) {
        oldValue = oldIncident.properties
          ? (oldIncident.properties as Record<string, unknown>)[key]
          : null;
      }

      const newValue = (updates[name] ? updates[name] : updates[key]) as ResilientFieldPrimitives;

      const oldValueShape = getValueFieldShape(
        fieldMeta,
        getValueFromOldField(fieldMeta, oldValue)
      );
      const newValueShape = getValueFieldShape(
        fieldMeta,
        newValue,
        oldValue as ResilientFieldPrimitives
      );
      return {
        field: { name },
        old_value: oldValueShape,
        new_value: newValueShape,
      };
    }),
  };
};

export function transformFieldMetadataToRecord(
  fields: ResilientFieldMeta[]
): Record<string, ResilientFieldMeta> {
  return fields.reduce<Record<string, ResilientFieldMeta>>((acc, field) => {
    acc[field.name] = {
      name: field.name,
      input_type: field.input_type,
      read_only: field.read_only,
      required: field.required,
      text: field.text,
      internal: field.internal,
      prefix: field.prefix,
    };
    return acc;
  }, {});
}
