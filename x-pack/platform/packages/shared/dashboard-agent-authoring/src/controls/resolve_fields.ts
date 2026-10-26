/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import type { Logger } from '@kbn/logging';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { ControlFieldCapabilities, ResolveControlFieldCapabilities } from '../types';
import { getErrorMessage, type DashboardFailure } from '../utils';
import type { ControlInput } from './schema';
import {
  createControlFailure,
  isReported,
  type ControlsResult,
  type PlannedControl,
} from './planned_control';

type DataControlInput = Exclude<ControlInput, { type: typeof TIME_SLIDER_CONTROL }>;

const getFieldCandidates = ({ type, field_name: fieldName }: DataControlInput): string[] =>
  type === RANGE_SLIDER_CONTROL ? [fieldName] : [fieldName, `${fieldName}.keyword`];

/** Scalar numeric types a range slider can use; excludes object types like `aggregate_metric_double`. */
const SCALAR_NUMERIC_FIELD_TYPES: ReadonlySet<string> = new Set([
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
  ES_FIELD_TYPES.UNSIGNED_LONG,
]);

/**
 * Types an options list can group on with `STATS BY` and show as dropdown values. Field caps
 * reports `constant_keyword` and `wildcard` as `keyword`. Other aggregatable types either fail
 * in ES|QL (`aggregate_metric_double`, ranges, `binary`) or produce unusable values (geo,
 * `histogram`, `flattened`).
 */
const OPTIONS_LIST_FIELD_TYPES: ReadonlySet<string> = new Set([
  ...SCALAR_NUMERIC_FIELD_TYPES,
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.TEXT,
  ES_FIELD_TYPES.VERSION,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.BOOLEAN,
  ES_FIELD_TYPES.DATE,
  ES_FIELD_TYPES.DATE_NANOS,
]);

interface UsableField {
  fieldName: string;
  type: string;
}

/**
 * Pick the first usable candidate, but prefer the `.keyword` sibling over an analyzed
 * text field, which can be aggregatable through `fielddata` yet groups on tokens.
 */
const pickField = (
  candidates: string[],
  capabilities: ControlFieldCapabilities
): UsableField | undefined => {
  const [firstField, ...otherFields] = candidates.flatMap((fieldName): UsableField[] => {
    const capability = capabilities.get(fieldName);
    return capability?.status === 'usable' ? [{ fieldName, type: capability.type }] : [];
  });
  return firstField?.type === ES_FIELD_TYPES.TEXT && otherFields.length > 0
    ? otherFields[0]
    : firstField;
};

const loadCapabilitiesByIndex = async ({
  controls,
  resolveControlFieldCapabilities,
  projectRouting,
  logger,
}: {
  controls: DataControlInput[];
  resolveControlFieldCapabilities: ResolveControlFieldCapabilities;
  projectRouting?: string;
  logger: Logger;
}): Promise<Map<string, ControlFieldCapabilities | undefined>> => {
  const fieldNamesByIndex = new Map<string, string[]>();
  controls.forEach((control) => {
    fieldNamesByIndex.set(control.index, [
      ...(fieldNamesByIndex.get(control.index) ?? []),
      ...getFieldCandidates(control),
    ]);
  });

  return new Map(
    await Promise.all(
      [...fieldNamesByIndex].map(
        async ([index, fieldNames]) =>
          [
            index,
            await resolveControlFieldCapabilities({ index, fieldNames, projectRouting }).catch(
              (error) => {
                logger.warn(
                  `Could not load fields for index "${index}", adding its controls unvalidated: ${getErrorMessage(
                    error
                  )}`
                );
                return undefined;
              }
            ),
          ] as const
      )
    )
  );
};

const resolveControlField = (
  control: DataControlInput,
  capabilities: ControlFieldCapabilities
): { resolvedFieldName: string } | { reason: string } => {
  const candidates = getFieldCandidates(control);
  const field = pickField(candidates, capabilities);
  const fieldOnIndex = `Field "${control.field_name}" on index "${control.index}"`;
  if (field === undefined) {
    const statuses = candidates.map((candidate) => capabilities.get(candidate)?.status);
    if (statuses.includes('conflicting')) {
      return { reason: `${fieldOnIndex} has conflicting mappings.` };
    }
    if (statuses.includes('not_aggregatable')) {
      return { reason: `${fieldOnIndex} is not aggregatable.` };
    }
    return { reason: `${fieldOnIndex} is not mapped.` };
  }

  if (control.type === RANGE_SLIDER_CONTROL && !SCALAR_NUMERIC_FIELD_TYPES.has(field.type)) {
    return { reason: `${fieldOnIndex} is not numeric, which range_slider_control needs.` };
  }

  if (control.type === OPTIONS_LIST_CONTROL && !OPTIONS_LIST_FIELD_TYPES.has(field.type)) {
    return {
      reason: `${fieldOnIndex} is not a keyword, numeric, date, ip, boolean, or version field, which options_list_control needs.`,
    };
  }

  return { resolvedFieldName: field.fieldName };
};

/**
 * Keep controls whose field Elasticsearch can `STATS BY`, rewriting options list
 * text fields to their `.keyword` sibling. Range sliders additionally require a
 * numeric field. Other data controls are left out and reported when {@link isReported}.
 * Controls on an index whose fields cannot be loaded are kept unvalidated.
 */
export const resolveControlFields = async ({
  controls,
  resolveControlFieldCapabilities,
  projectRouting,
  logger,
}: {
  controls: PlannedControl[];
  resolveControlFieldCapabilities?: ResolveControlFieldCapabilities;
  projectRouting?: string;
  logger: Logger;
}): Promise<ControlsResult> => {
  if (!resolveControlFieldCapabilities) {
    return { controls, failures: [] };
  }

  const capabilitiesByIndex = await loadCapabilitiesByIndex({
    controls: controls.flatMap(({ control }) =>
      control.type === TIME_SLIDER_CONTROL ? [] : [control]
    ),
    resolveControlFieldCapabilities,
    projectRouting,
    logger,
  });

  const resolvedControls: PlannedControl[] = [];
  const failures: DashboardFailure[] = [];

  controls.forEach((plannedControl) => {
    const { identifier, control, replaces } = plannedControl;
    const capabilities =
      control.type === TIME_SLIDER_CONTROL ? undefined : capabilitiesByIndex.get(control.index);
    if (control.type === TIME_SLIDER_CONTROL || !capabilities) {
      resolvedControls.push(plannedControl);
      return;
    }

    const resolution = resolveControlField(control, capabilities);
    if ('resolvedFieldName' in resolution) {
      resolvedControls.push({
        identifier,
        control: { ...control, field_name: resolution.resolvedFieldName },
        replaces,
      });
      return;
    }

    if (isReported(plannedControl)) {
      failures.push(createControlFailure(identifier, resolution.reason));
      return;
    }
    logger.debug(`Left out ${identifier}: ${resolution.reason}`);
  });

  return { controls: resolvedControls, failures };
};
