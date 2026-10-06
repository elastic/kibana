/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ControlValuesSource,
  DEFAULT_DSL_OPTIONS_LIST_STATE,
  DEFAULT_RANGE_SLIDER_STATE,
  DEFAULT_TIME_SLIDER_STATE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import type { DashboardPinnedPanel } from '@kbn/as-code-dashboard-schema';
import type { Logger } from '@kbn/core/server';
import { formatEsqlIdentifier } from '@kbn/esql-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { z } from '@kbn/zod/v4';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { getErrorMessage, type OperationFailure } from '../utils';
import {
  defineOperation,
  type ControlFieldCapabilities,
  type ResolveControlFieldCapabilities,
} from './types';

const controlWidthSchema = z
  .enum(['small', 'medium', 'large'])
  .describe('Control width. Defaults to "medium".');

const dataControlFields = {
  field_name: z
    .string()
    .min(1)
    .max(256)
    .describe('Exact name of a field mapped on `index` (e.g. "service.name").'),
  index: z
    .string()
    .min(1)
    .max(256)
    .describe('Index, alias, or datastream to query for values (e.g. "logs-*").'),
};

const controlLayoutFields = {
  width: controlWidthSchema.optional(),
  grow: z
    .boolean()
    .optional()
    .describe('Expand to fill available horizontal space. Defaults to true.'),
};

const userRequestedFields = {
  user_requested: z
    .boolean()
    .optional()
    .describe('True only when the user asked explicitly for the controls.'),
};

const dataControlInputFields = {
  ...dataControlFields,
  title: z.string().max(256).optional().describe('Human-readable label shown above the control.'),
  ...userRequestedFields,
  ...controlLayoutFields,
};

const optionsListControlInputSchema = z.object({
  type: z.literal(OPTIONS_LIST_CONTROL),
  ...dataControlInputFields,
});

const rangeSliderControlInputSchema = z.object({
  type: z.literal(RANGE_SLIDER_CONTROL),
  ...dataControlInputFields,
});

const timeSliderControlInputSchema = z.object({
  type: z.literal(TIME_SLIDER_CONTROL),
  ...userRequestedFields,
  ...controlLayoutFields,
});

const controlInputSchema = z.discriminatedUnion('type', [
  optionsListControlInputSchema,
  rangeSliderControlInputSchema,
  timeSliderControlInputSchema,
]);

type ControlInput = z.infer<typeof controlInputSchema>;

/**
 * Keep at most one time slider. Extra user-requested ones are reported as
 * failures; extra ones the agent added on its own are left out silently.
 */
const filterDuplicateTimeSliders = ({
  existingControls,
  controlsToAdd,
  logger,
  failures,
}: {
  existingControls: Array<{ type?: string }>;
  controlsToAdd: ControlInput[];
  logger: Logger;
  failures: OperationFailure[];
}): ControlInput[] => {
  const hasTimeSlider = existingControls.some((control) => control.type === TIME_SLIDER_CONTROL);
  let canAddTimeSlider = !hasTimeSlider;

  return controlsToAdd.filter((control, controlInputIndex) => {
    if (control.type !== TIME_SLIDER_CONTROL) {
      return true;
    }

    if (canAddTimeSlider) {
      canAddTimeSlider = false;
      return true;
    }

    if (control.user_requested !== true) {
      logger.debug(
        `Left out controls[${controlInputIndex}]: the dashboard already has a time slider.`
      );
      return false;
    }

    failures.push({
      type: DASHBOARD_OPERATION_FAILURE_TYPES.addControls,
      identifier: `controls[${controlInputIndex}]`,
      error: 'A dashboard can contain at most one time_slider_control.',
    });
    return false;
  });
};

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

/**
 * Report an unresolved user-requested control as a failure. Controls with the
 * same message share one entry.
 */
const recordControlFailure = ({
  failures,
  fieldName,
  message,
}: {
  failures: OperationFailure[];
  fieldName: string;
  message: string;
}) => {
  const type = DASHBOARD_OPERATION_FAILURE_TYPES.addControls;
  const group = failures.find((failure) => failure.type === type && failure.error === message);
  if (group) {
    group.identifier = `${group.identifier}, ${fieldName}`;
  } else {
    failures.push({ type, identifier: fieldName, error: message });
  }
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
  if (field === undefined) {
    const statuses = candidates.map((candidate) => capabilities.get(candidate)?.status);
    if (statuses.includes('conflicting')) {
      return { reason: `Has conflicting mappings on index "${control.index}".` };
    }
    if (statuses.includes('not_aggregatable')) {
      return { reason: `Is not aggregatable on index "${control.index}".` };
    }
    return { reason: `Not mapped on index "${control.index}".` };
  }

  if (control.type === RANGE_SLIDER_CONTROL && !SCALAR_NUMERIC_FIELD_TYPES.has(field.type)) {
    return { reason: `range_slider_control needs a numeric field on index "${control.index}".` };
  }

  if (control.type === OPTIONS_LIST_CONTROL && !OPTIONS_LIST_FIELD_TYPES.has(field.type)) {
    return {
      reason: `options_list_control needs a keyword, numeric, date, ip, boolean, or version field on index "${control.index}".`,
    };
  }

  return { resolvedFieldName: field.fieldName };
};

/**
 * Keep controls whose field Elasticsearch can `STATS BY`, rewriting options list
 * text fields to their `.keyword` sibling. Range sliders additionally require a
 * numeric field. Other data controls are left out; user-requested ones are
 * reported as failures.
 * Controls on an index whose fields cannot be loaded are kept unvalidated.
 */
const resolveControlFields = async ({
  controls,
  resolveControlFieldCapabilities,
  projectRouting,
  logger,
  failures,
}: {
  controls: ControlInput[];
  resolveControlFieldCapabilities?: ResolveControlFieldCapabilities;
  projectRouting?: string;
  logger: Logger;
  failures: OperationFailure[];
}): Promise<ControlInput[]> => {
  if (!resolveControlFieldCapabilities) {
    return controls;
  }

  const capabilitiesByIndex = await loadCapabilitiesByIndex({
    controls: controls.filter(
      (control): control is DataControlInput => control.type !== TIME_SLIDER_CONTROL
    ),
    resolveControlFieldCapabilities,
    projectRouting,
    logger,
  });

  const resolvedControls: ControlInput[] = [];

  controls.forEach((control) => {
    if (control.type === TIME_SLIDER_CONTROL) {
      resolvedControls.push(control);
      return;
    }

    const capabilities = capabilitiesByIndex.get(control.index);
    if (!capabilities) {
      resolvedControls.push(control);
      return;
    }

    const resolution = resolveControlField(control, capabilities);
    if ('resolvedFieldName' in resolution) {
      resolvedControls.push({ ...control, field_name: resolution.resolvedFieldName });
      return;
    }

    if (control.user_requested === true) {
      recordControlFailure({
        failures,
        fieldName: control.field_name,
        message: resolution.reason,
      });
      return;
    }
    logger.debug(`Left out control on "${control.field_name}": ${resolution.reason}`);
  });

  return resolvedControls;
};

const buildStoredControl = (control: ControlInput): DashboardPinnedPanel => {
  const { type, width = 'medium', grow = true } = control;
  const id = uuidv4();

  if (type === TIME_SLIDER_CONTROL) {
    const config = {
      ...DEFAULT_TIME_SLIDER_STATE,
    } satisfies Extract<DashboardPinnedPanel, { type: typeof TIME_SLIDER_CONTROL }>['config'];

    return {
      type,
      id,
      width,
      grow,
      config,
    };
  }

  if (type === OPTIONS_LIST_CONTROL) {
    const { field_name, index, title } = control;
    const config = {
      ...DEFAULT_DSL_OPTIONS_LIST_STATE,
      ...(title !== undefined ? { title } : {}),
      values_source: ControlValuesSource.ESQL,
      esql_query: `FROM ${index} | STATS BY ${formatEsqlIdentifier(field_name)}`,
    } satisfies Extract<DashboardPinnedPanel, { type: typeof OPTIONS_LIST_CONTROL }>['config'];

    return {
      type,
      id,
      width,
      grow,
      config,
    };
  }

  const { field_name, index, title } = control;
  const config = {
    ...DEFAULT_RANGE_SLIDER_STATE,
    ...(title !== undefined ? { title } : {}),
    values_source: ControlValuesSource.ESQL,
    esql_query: `FROM ${index} | STATS BY ${formatEsqlIdentifier(field_name)}`,
  } satisfies Extract<DashboardPinnedPanel, { type: typeof RANGE_SLIDER_CONTROL }>['config'];

  return {
    type,
    id,
    width,
    grow,
    config,
  };
};

export const addControlsOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_controls'),
    controls: z
      .array(controlInputSchema)
      .min(1)
      .describe(
        'Controls to append. Use options_list_control for categorical/keyword fields, range_slider_control for numeric fields, time_slider_control for time sub-range filtering (at most one per dashboard).'
      ),
  }),
  handler: async ({ dashboardData, operation, context }) => {
    const existingControls = dashboardData.pinned_panels ?? [];
    const controlsToAdd = await resolveControlFields({
      controls: filterDuplicateTimeSliders({
        existingControls,
        controlsToAdd: operation.controls,
        logger: context.logger,
        failures: context.failures,
      }),
      resolveControlFieldCapabilities: context.resolveControlFieldCapabilities,
      projectRouting: dashboardData.project_routing,
      logger: context.logger,
      failures: context.failures,
    });

    const newControls = controlsToAdd.map(buildStoredControl);
    return {
      ...dashboardData,
      pinned_panels: [...existingControls, ...newControls],
    };
  },
});
