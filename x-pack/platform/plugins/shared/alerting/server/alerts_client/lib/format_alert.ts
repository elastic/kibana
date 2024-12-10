/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, get, isEmpty, isNull, isUndefined, merge, omit } from 'lodash';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { RuleAlertData } from '../../types';
import { REFRESH_FIELDS_ALL } from './alert_conflict_resolver';

const expandDottedField = (dottedFieldName: string, val: unknown): object => {
  const parts = dottedFieldName.split('.');
  if (parts.length === 1) {
    return { [parts[0]]: val };
  } else {
    return { [parts[0]]: expandDottedField(parts.slice(1).join('.'), val) };
  }
};

export const expandFlattenedAlert = (alert: object) => {
  return Object.entries(alert).reduce(
    (acc, [key, val]) => merge(acc, expandDottedField(key, val)),
    {}
  );
};

type Obj = Record<string, unknown>;

// Removes empty nested objects
export const compactObject = (obj: Obj) => {
  return Object.keys(obj)
    .filter((key: string) => {
      // just filter out empty objects
      // keep any primitives or arrays, even empty arrays
      return (
        !isUndefined(obj[key]) &&
        (Array.isArray(obj[key]) ||
          typeof obj[key] !== 'object' ||
          (typeof obj[key] === 'object' && (!isEmpty(obj[key]) || obj[key] === null)))
      );
    })
    .reduce<Obj>((acc, curr) => {
      if (typeof obj[curr] !== 'object' || Array.isArray(obj[curr])) {
        acc[curr] = obj[curr];
      } else if (isNull(obj[curr])) {
        acc[curr] = null;
      } else {
        const compacted = compactObject(obj[curr] as Obj);
        if (!isEmpty(compacted)) {
          acc[curr] = compacted;
        }
      }
      return acc;
    }, {});
};

/**
 * If we're replacing field values in an unflattened alert
 * with the flattened version, we want to remove the unflattened version
 * to avoid duplicate data in the doc
 */

export const removeUnflattenedFieldsFromAlert = (
  alert: Record<string, unknown>,
  flattenedData: object
) => {
  // make a copy of the alert
  let alertCopy = cloneDeep(alert);

  // for each flattened field in the flattened data object,
  // check whether that path exists in the unflattened alert
  // and omit it if it does
  Object.keys(flattenedData).forEach((payloadKey: string) => {
    const val = get(alertCopy, payloadKey, null);
    if (null == alertCopy[payloadKey] && null != val) {
      alertCopy = omit(alertCopy, payloadKey);
    }
  });
  return compactObject(alertCopy);
};

export const replaceRefreshableAlertFields = <AlertData extends RuleAlertData>(
  alert: Alert & AlertData
) => {
  // Make sure that any alert fields that are updateable are flattened.
  return REFRESH_FIELDS_ALL.reduce<Record<string, string | string[]>>(
    (acc: Record<string, string | string[]>, currField) => {
      const value = get(alert, currField);
      if (null != value) {
        acc[currField] = value;
      }
      return acc;
    },
    {}
  );
};
