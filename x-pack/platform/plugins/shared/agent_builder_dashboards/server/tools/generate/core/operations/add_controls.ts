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
  LoadAggregatableFieldTypes,
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
      'True when the user asked for this control. Leave unset for controls you add on your own.'
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

const MAX_AVAILABLE_FIELDS = 30;

const getFieldCandidates = ({ type, field_name: fieldName }: DataControlInput): string[] =>
  type === RANGE_SLIDER_CONTROL ? [fieldName] : [fieldName, `${fieldName}.keyword`];

const hasKbnFieldType = (types: string[], kbnFieldType: KBN_FIELD_TYPES): boolean =>
  types.every((type) => castEsToKbnFieldTypeName(type) === kbnFieldType);

const describeAvailableFields = (
  fieldTypes: AggregatableFieldTypes,
  controlType: DataControlInput['type']
): string => {
  const isRangeSlider = controlType === RANGE_SLIDER_CONTROL;
  const kbnFieldType = isRangeSlider ? KBN_FIELD_TYPES.NUMBER : KBN_FIELD_TYPES.STRING;
  const availableFields = [...fieldTypes]
    .filter(([, types]) => hasKbnFieldType(types, kbnFieldType))
    .map(([fieldName]) => fieldName)
    .sort()
    .slice(0, MAX_AVAILABLE_FIELDS);
  return availableFields.length > 0
    ? ` Mapped ${isRangeSlider ? 'numeric' : 'keyword'} fields: ${availableFields.join(', ')}.`
    : '';
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

/**
 * Keep controls whose field Elasticsearch can `STATS BY`, rewriting options list
 * text fields to their `.keyword` sibling. Range sliders additionally require a
 * numeric field. Other data controls are left out; user-requested ones are
 * reported as failures with the mapped fields that could back them instead.
 * Controls on an index whose fields cannot be loaded are kept unvalidated.
 */
const resolveControlFields = async ({
  controls,
  loadAggregatableFieldTypes,
  projectRouting,
  logger,
  failures,
}: {
  controls: ControlInput[];
  loadAggregatableFieldTypes?: LoadAggregatableFieldTypes;
  projectRouting?: string;
  logger: Logger;
  failures: OperationFailure[];
}): Promise<ControlInput[]> => {
  if (!loadAggregatableFieldTypes) {
    return controls;
  }

  const indices = new Set(
    controls.flatMap((control) => (control.type === TIME_SLIDER_CONTROL ? [] : [control.index]))
  );
  const fieldTypesByIndex = new Map(
    await Promise.all(
      [...indices].map(
        async (index) =>
          [
            index,
            await loadAggregatableFieldTypes({ index, projectRouting }).catch((error) => {
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

  return controls.flatMap((control): ControlInput[] => {
    if (control.type === TIME_SLIDER_CONTROL) {
      return [control];
    }

    const { index, field_name: fieldName } = control;
    const fieldTypes = fieldTypesByIndex.get(index);
    if (!fieldTypes) {
      return [control];
    }

    const skip = (reason: string): ControlInput[] => {
      if (control.user_requested !== true) {
        logger.debug(`Left out control on "${fieldName}": ${reason}`);
        return [];
      }
      recordControlFailure({
        failures,
        fieldName,
        message: `${reason}${describeAvailableFields(fieldTypes, control.type)}`,
      });
      return [];
    };

    const resolvedFieldName = getFieldCandidates(control).find((candidate) =>
      fieldTypes.has(candidate)
    );
    if (resolvedFieldName === undefined) {
      return skip(`Not mapped on index "${index}".`);
    }

    if (
      control.type === RANGE_SLIDER_CONTROL &&
      !hasKbnFieldType(fieldTypes.get(resolvedFieldName) ?? [], KBN_FIELD_TYPES.NUMBER)
    ) {
      return skip(`range_slider_control needs a numeric field on index "${index}".`);
    }

    return [{ ...control, field_name: resolvedFieldName }];
  });
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
      loadAggregatableFieldTypes: context.loadAggregatableFieldTypes,
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
