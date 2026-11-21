/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { FieldValue, InvestigationType } from '../../../../common/investigations/types';
import { useInvestigationTypes } from '../../hooks';

/** One form field of the investigation types, as the queue filters and shows it. */
export interface QueueFieldDef {
  /** Key of the typed copy on the record: filter `field=<key>:<value>`, sort `fields.<key>`. */
  mirrorKey: string;
  label: string;
  control: string;
  /** Fixed values, for select, radio and checkbox fields. */
  options?: string[];
}

const CHOICE_CONTROLS = new Set(['SELECT_BASIC', 'RADIO_GROUP', 'CHECKBOX_GROUP']);

/** The union of the fields of all types, one entry per mirror key, in the order types list them. */
export const getQueueFieldDefs = (types: InvestigationType[]): QueueFieldDef[] => {
  const byKey = new Map<string, QueueFieldDef>();
  types.forEach(({ fields }) =>
    fields
      .filter(({ display_only: displayOnly }) => !displayOnly)
      .forEach(({ mirror_key: mirrorKey, label, control, options }) => {
        const existing = byKey.get(mirrorKey);
        if (!existing) {
          byKey.set(mirrorKey, {
            mirrorKey,
            label,
            control,
            ...(CHOICE_CONTROLS.has(control) && options ? { options: [...options] } : {}),
          });
          return;
        }
        if (existing.options && options) {
          options.forEach((option) => {
            if (!existing.options?.includes(option)) existing.options?.push(option);
          });
        }
      })
  );
  return Array.from(byKey.values());
};

/** Fields for the queue's Fields filter and optional columns, from `GET _types`. */
export const useQueueFields = (): { fields: QueueFieldDef[]; isLoading: boolean } => {
  const { data, isLoading } = useInvestigationTypes();
  const fields = useMemo(() => getQueueFieldDefs(data?.types ?? []), [data]);
  return { fields, isLoading };
};

/** A record's mirrored value as text for a table cell; null when the field is empty. */
export const formatFieldValue = (
  value: FieldValue | undefined,
  yes: string,
  no: string
): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? yes : no;
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : null;
  return String(value);
};
