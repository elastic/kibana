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
import { castEsToKbnFieldTypeName, KBN_FIELD_TYPES } from '@kbn/field-types';
import { z } from '@kbn/zod/v4';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { getErrorMessage, type OperationFailure } from '../utils';
import { defineOperation } from './types';
import type {
  AggregatableFieldTypes,
  AggregatableFieldTypesLoader,
} from './aggregatable_field_types';

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

const dataControlInputFields = {
  ...dataControlFields,
  title: z.string().max(256).optional().describe('Human-readable label shown above the control.'),
  user_requested: z
    .boolean()
    .optional()
    .describe(
      'True only when the user named this specific filter or field. Leave unset when you chose the field, including when the user only asked for controls in general.'
    ),
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
  ...controlLayoutFields,
});

const controlInputSchema = z.discriminatedUnion('type', [
  optionsListControlInputSchema,
  rangeSliderControlInputSchema,
  timeSliderControlInputSchema,
]);

type ControlInput = z.infer<typeof controlInputSchema>;

const filterDuplicateTimeSliders = ({
  existingControls,
  controlsToAdd,
  failures,
}: {
  existingControls: Array<{ type?: string }>;
  controlsToAdd: ControlInput[];
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

const hasKbnFieldType = (types: string[], kbnFieldType: KBN_FIELD_TYPES): boolean =>
  types.every((type) => castEsToKbnFieldTypeName(type) === kbnFieldType);

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

const loadFieldTypesByIndex = async ({
  controls,
  loader,
  projectRouting,
  logger,
}: {
  controls: DataControlInput[];
  loader: AggregatableFieldTypesLoader;
  projectRouting?: string;
  logger: Logger;
}): Promise<Map<string, AggregatableFieldTypes | undefined>> => {
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
            await loader.loadFields({ index, projectRouting, fieldNames }).catch((error) => {
              logger.warn(
                `Could not load fields for index "${index}", adding its controls unvalidated: ${getErrorMessage(
                  error
                )}`
              );
              return undefined;
            }),
          ] as const
      )
    )
  );
};

const resolveControlField = (
  control: DataControlInput,
  fieldTypes: AggregatableFieldTypes
): { resolvedFieldName: string } | { reason: string } => {
  const resolvedFieldName = getFieldCandidates(control).find((candidate) =>
    fieldTypes.has(candidate)
  );
  if (resolvedFieldName === undefined) {
    return { reason: `Not mapped on index "${control.index}".` };
  }

  if (
    control.type === RANGE_SLIDER_CONTROL &&
    !hasKbnFieldType(fieldTypes.get(resolvedFieldName) ?? [], KBN_FIELD_TYPES.NUMBER)
  ) {
    return { reason: `range_slider_control needs a numeric field on index "${control.index}".` };
  }

  return { resolvedFieldName };
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
  loader,
  projectRouting,
  logger,
  failures,
}: {
  controls: ControlInput[];
  loader?: AggregatableFieldTypesLoader;
  projectRouting?: string;
  logger: Logger;
  failures: OperationFailure[];
}): Promise<ControlInput[]> => {
  if (!loader) {
    return controls;
  }

  const fieldTypesByIndex = await loadFieldTypesByIndex({
    controls: controls.filter(
      (control): control is DataControlInput => control.type !== TIME_SLIDER_CONTROL
    ),
    loader,
    projectRouting,
    logger,
  });

  const resolvedControls: ControlInput[] = [];

  controls.forEach((control) => {
    if (control.type === TIME_SLIDER_CONTROL) {
      resolvedControls.push(control);
      return;
    }

    const fieldTypes = fieldTypesByIndex.get(control.index);
    if (!fieldTypes) {
      resolvedControls.push(control);
      return;
    }

    const resolution = resolveControlField(control, fieldTypes);
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
        failures: context.failures,
      }),
      loader: context.aggregatableFieldTypesLoader,
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
