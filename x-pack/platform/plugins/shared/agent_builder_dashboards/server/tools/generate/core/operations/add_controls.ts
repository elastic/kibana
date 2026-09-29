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
import { getErrorMessage, type PanelFailure } from '../utils';
import { defineOperation } from './types';

const controlWidthSchema = z
  .enum(['small', 'medium', 'large'])
  .describe('Control width. Defaults to "medium".');

const dataControlFields = {
  field_name: z
    .string()
    .min(1)
    .max(256)
    .describe('Exact field name as it appears in the panel ES|QL queries (e.g. "service.name").'),
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

interface IndexedControlInput {
  control: ControlInput;
  controlInputIndex: number;
}

const createFailureRecorder =
  (failures: PanelFailure[], controlInputIndex: number) => (error: string) =>
    failures.push({
      type: DASHBOARD_OPERATION_FAILURE_TYPES.addControls,
      identifier: `controls[${controlInputIndex}]`,
      error,
    });

const filterDuplicateTimeSliders = ({
  existingControls,
  controlsToAdd,
  failures,
}: {
  existingControls: Array<{ type?: string }>;
  controlsToAdd: IndexedControlInput[];
  failures: PanelFailure[];
}): IndexedControlInput[] => {
  const hasTimeSlider = existingControls.some((control) => control.type === TIME_SLIDER_CONTROL);
  let canAddTimeSlider = !hasTimeSlider;

  return controlsToAdd.filter(({ control, controlInputIndex }) => {
    if (control.type !== TIME_SLIDER_CONTROL) {
      return true;
    }

    if (canAddTimeSlider) {
      canAddTimeSlider = false;
      return true;
    }

    const recordFailure = createFailureRecorder(failures, controlInputIndex);
    recordFailure('A dashboard can contain at most one time_slider_control.');
    return false;
  });
};

const getFieldCandidates = (control: Exclude<ControlInput, { type: typeof TIME_SLIDER_CONTROL }>) =>
  control.type === RANGE_SLIDER_CONTROL
    ? [control.field_name]
    : [control.field_name, `${control.field_name}.keyword`];

const fetchAggregatableFieldTypes = async ({
  esClient,
  index,
  fields,
}: {
  esClient: ElasticsearchClient;
  index: string;
  fields: string[];
}): Promise<Map<string, string[]>> => {
  const response = await esClient.fieldCaps({
    index,
    fields,
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

const isNumericField = (types: string[]): boolean =>
  types.every((type) => castEsToKbnFieldTypeName(type) === KBN_FIELD_TYPES.NUMBER);

/**
 * Keep controls whose field Elasticsearch can `STATS BY`, rewriting options list
 * text fields to their `.keyword` sibling. Range sliders additionally require a
 * numeric field. Other data controls are skipped as failures.
 */
const resolveControlFields = async ({
  controls,
  esClient,
  failures,
}: {
  controls: IndexedControlInput[];
  esClient?: ElasticsearchClient;
  failures: PanelFailure[];
}): Promise<IndexedControlInput[]> => {
  if (!esClient) {
    return controls;
  }

  const candidatesByIndex = new Map<string, string[]>();
  for (const { control } of controls) {
    if (control.type !== TIME_SLIDER_CONTROL) {
      const { index } = control;
      candidatesByIndex.set(index, [
        ...(candidatesByIndex.get(index) ?? []),
        ...getFieldCandidates(control),
      ]);
    }
  }

  const lookupByIndex = new Map(
    await Promise.all(
      [...candidatesByIndex].map(
        async ([index, fields]) =>
          [
            index,
            await fetchAggregatableFieldTypes({ esClient, index, fields }).catch(
              (error) => new Error(getErrorMessage(error))
            ),
          ] as const
      )
    )
  );

  const resolved: IndexedControlInput[] = [];
  for (const indexedControl of controls) {
    const { control, controlInputIndex } = indexedControl;
    if (control.type === TIME_SLIDER_CONTROL) {
      resolved.push(indexedControl);
      continue;
    }

    const recordFailure = createFailureRecorder(failures, controlInputIndex);
    const { index, field_name: fieldName } = control;
    const aggregatableFieldTypes = lookupByIndex.get(index);
    if (!(aggregatableFieldTypes instanceof Map)) {
      recordFailure(
        `Could not load fields for index "${index}": ${aggregatableFieldTypes?.message}`
      );
      continue;
    }

    const resolvedFieldName = getFieldCandidates(control).find((candidate) =>
      aggregatableFieldTypes.has(candidate)
    );
    if (resolvedFieldName === undefined) {
      recordFailure(
        `Field "${fieldName}" is not an aggregatable field in the mappings of index "${index}". Controls query the index directly, so fields created in ES|QL (DISSECT, GROK, EVAL, RENAME) cannot be used. Pick a mapped field or skip this control.`
      );
      continue;
    }

    const resolvedFieldTypes = aggregatableFieldTypes.get(resolvedFieldName) ?? [];
    if (control.type === RANGE_SLIDER_CONTROL && !isNumericField(resolvedFieldTypes)) {
      recordFailure(
        `Field "${fieldName}" is not numeric (${resolvedFieldTypes.join(
          ', '
        )}); range_slider_control requires a numeric field.`
      );
      continue;
    }

    resolved.push({ controlInputIndex, control: { ...control, field_name: resolvedFieldName } });
  }

  return resolved;
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
    const resolvedControls = await resolveControlFields({
      controls: operation.controls.map((control, controlInputIndex) => ({
        control,
        controlInputIndex,
      })),
      esClient: context.esClient,
      failures: context.failures,
    });
    const controlsToAdd = filterDuplicateTimeSliders({
      existingControls,
      controlsToAdd: resolvedControls,
      failures: context.failures,
    });

    const newControls = controlsToAdd.map(({ control }) => buildStoredControl(control));
    return {
      ...dashboardData,
      pinned_panels: [...existingControls, ...newControls],
    };
  },
});
