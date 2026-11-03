/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FieldErrors } from 'react-hook-form';
import type { BuildConnectorFormData } from './types';

interface FormErrorSummaryItem {
  path: string;
  message: string;
}

const ITEM_TYPE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.buildConnector.errorSummary.itemType',
  { defaultMessage: 'Item type' }
);
const DEFINITION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.buildConnector.errorSummary.definition',
  { defaultMessage: 'Definition' }
);

const collectErrors = (value: unknown, path: string[] = []): FormErrorSummaryItem[] => {
  if (!value || typeof value !== 'object') {
    return [];
  }
  if ('message' in value && typeof value.message === 'string') {
    return [{ path: path.join('.'), message: value.message }];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    key === 'ref' || key === 'type' || key === 'types' ? [] : collectErrors(child, [...path, key])
  );
};

const numberedLabel = (kind: 'action' | 'config' | 'param', number: number, name?: string) => {
  const label = {
    action: i18n.translate('xpack.triggersActionsUI.buildConnector.errorSummary.action', {
      defaultMessage: 'Action {number}',
      values: { number },
    }),
    config: i18n.translate('xpack.triggersActionsUI.buildConnector.errorSummary.config', {
      defaultMessage: 'Config field {number}',
      values: { number },
    }),
    param: i18n.translate('xpack.triggersActionsUI.buildConnector.errorSummary.param', {
      defaultMessage: 'Param {number}',
      values: { number },
    }),
  }[kind];
  return name ? `${label} (${name})` : label;
};

const describePath = (path: string, values: BuildConnectorFormData): string => {
  const segments = path.split('.');
  if (segments[0] === 'actions' && /^\d+$/.test(segments[1] ?? '')) {
    const actionIndex = Number(segments[1]);
    const action = values.actions[actionIndex];
    const parts = [numberedLabel('action', actionIndex + 1, action?.name)];
    if (segments[2] === 'input' && /^\d+$/.test(segments[3] ?? '')) {
      const paramIndex = Number(segments[3]);
      parts.push(numberedLabel('param', paramIndex + 1, action?.input[paramIndex]?.name));
      segments.splice(0, 4);
    } else {
      segments.splice(0, 2);
    }
    if (segments.length > 0 && segments.join('.') !== 'root') {
      parts.push(
        segments.map((segment) => (segment === 'items' ? ITEM_TYPE_LABEL : segment)).join(' ')
      );
    }
    return parts.join(' > ');
  }
  if (segments[0] === 'config' && /^\d+$/.test(segments[1] ?? '')) {
    const fieldIndex = Number(segments[1]);
    return [
      numberedLabel('config', fieldIndex + 1, values.config[fieldIndex]?.name),
      segments[2] === 'items' ? ITEM_TYPE_LABEL : segments[2],
    ]
      .filter(Boolean)
      .join(' > ');
  }
  return path === 'root' ? DEFINITION_LABEL : path.replace(/\.root$/, '');
};

/** Lists form errors with the action and field that need an edit. */
export const getFormErrorSummary = (
  errors: FieldErrors<BuildConnectorFormData>,
  values: BuildConnectorFormData
): Array<{ label: string; message: string }> =>
  collectErrors(errors).map(({ path, message }) => ({
    label: describePath(path, values),
    message,
  }));
