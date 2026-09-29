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
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { formatEsqlIdentifier } from '@kbn/esql-utils';
import { castEsToKbnFieldTypeName, KBN_FIELD_TYPES } from '@kbn/field-types';
import { z } from '@kbn/zod/v4';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { getErrorMessage, type PanelFailure, type SkippedControl } from '../utils';
import { defineOperation } from './types';

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
  failures: PanelFailure[];
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

const fetchAggregatableFieldTypes = async (
  esClient: ElasticsearchClient,
  index: string
): Promise<Map<string, string[]>> => {
  const response = await esClient.fieldCaps({
    index,
    fields: ['*'],
    filters: '-metadata',
    ignore_unavailable: true,
    allow_no_indices: true,
  });
  return new Map(
    Object.entries(response.fields)
      .map(
        ([fieldName, capsByType]) =>
          [
            fieldName,
            Object.values(capsByType)
              .filter(({ aggregatable }) => aggregatable)
              .map(({ type }) => type),
          ] as const
      )
      .filter(([, types]) => types.length > 0)
  );
};

const hasKbnFieldType = (types: string[], kbnFieldType: KBN_FIELD_TYPES): boolean =>
  types.every((type) => castEsToKbnFieldTypeName(type) === kbnFieldType);

const getAvailableFields = (
  fieldTypes: Map<string, string[]>,
  controlType: DataControlInput['type']
): string[] => {
  const kbnFieldType =
    controlType === RANGE_SLIDER_CONTROL ? KBN_FIELD_TYPES.NUMBER : KBN_FIELD_TYPES.STRING;
  return [...fieldTypes]
    .filter(([, types]) => hasKbnFieldType(types, kbnFieldType))
    .map(([fieldName]) => fieldName)
    .sort()
    .slice(0, MAX_AVAILABLE_FIELDS);
};

const recordSkippedControl = (
  skippedControls: SkippedControl[],
  skip: Omit<SkippedControl, 'field_names'> & { fieldName: string }
) => {
  const { fieldName, index, reason, available_fields: availableFields } = skip;
  const group = skippedControls.find(
    (candidate) =>
      candidate.index === index &&
      candidate.reason === reason &&
      candidate.available_fields.join() === availableFields.join()
  );
  if (group) {
    group.field_names.push(fieldName);
    return;
  }
  skippedControls.push({
    field_names: [fieldName],
    index,
    reason,
    available_fields: availableFields,
  });
};

/**
 * Keep controls whose field Elasticsearch can `STATS BY`, rewriting options list
 * text fields to their `.keyword` sibling. Range sliders additionally require a
 * numeric field. Other data controls are reported as skipped, together with the
 * mapped fields that could back them instead.
 */
const resolveControlFields = async ({
  controls,
  esClient,
  failures,
  skippedControls,
}: {
  controls: ControlInput[];
  esClient?: ElasticsearchClient;
  failures: PanelFailure[];
  skippedControls: SkippedControl[];
}): Promise<ControlInput[]> => {
  if (!esClient) {
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
            await fetchAggregatableFieldTypes(esClient, index).catch((error) => {
              failures.push({
                type: DASHBOARD_OPERATION_FAILURE_TYPES.addControls,
                identifier: index,
                error: `Could not load fields for index "${index}": ${getErrorMessage(error)}`,
              });
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
      return [];
    }

    const skip = (reason: string): ControlInput[] => {
      recordSkippedControl(skippedControls, {
        fieldName,
        index,
        reason,
        available_fields: getAvailableFields(fieldTypes, control.type),
      });
      return [];
    };

    const resolvedFieldName = getFieldCandidates(control).find((candidate) =>
      fieldTypes.has(candidate)
    );
    if (resolvedFieldName === undefined) {
      return skip('Not mapped on the index.');
    }

    if (
      control.type === RANGE_SLIDER_CONTROL &&
      !hasKbnFieldType(fieldTypes.get(resolvedFieldName) ?? [], KBN_FIELD_TYPES.NUMBER)
    ) {
      return skip('range_slider_control needs a numeric field.');
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
      esClient: context.esClient,
      failures: context.failures,
      skippedControls: context.skippedControls,
    });

    const newControls = controlsToAdd.map(buildStoredControl);
    return {
      ...dashboardData,
      pinned_panels: [...existingControls, ...newControls],
    };
  },
});
