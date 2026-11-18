/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual } from 'lodash';
import {
  MAX_ASSIGNEES_PER_CASE,
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS_PER_CASE,
} from '../../../../common/constants';
import type {
  MergeCasesPreviewResponse,
  MergeConflict,
  MergeCustomFieldPreview,
  MergeExtendedFieldPreview,
  MergeFieldProvenance,
  MergeFieldsRequest,
  MergeLimit,
  MergeTemplateOption,
} from '../../../../common/types/api';
import type {
  Case,
  CaseConnector,
  CaseCustomFields,
  CaseUserProfile,
  CustomFieldsConfiguration,
} from '../../../../common/types/domain';
import { CaseSeverity, ConnectorTypes } from '../../../../common/types/domain';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { FieldType, isDisplayOnlyField } from '../../../../common/types/domain/template/fields';
import { getExtendedFieldIssues } from '../../../../common/types/domain/template/validate_extended_fields';
import { getNoneConnector } from '../../../../common/utils/connectors';
import {
  buildExtendedFieldsDefaults,
  getFieldSnakeKey,
} from '../../../../common/utils/template_fields';

type Fields = MergeCasesPreviewResponse['fields'];

/** A template some case uses, at its latest version. */
export interface MergeTemplateCandidate {
  id: string;
  name: string;
  isEnabled: boolean;
  version: number;
}

export interface MergeTemplates {
  /** False when the templates feature is off: templates are left as they are. */
  enabled: boolean;
  candidates: Map<string, MergeTemplateCandidate>;
  /** Resolved template fields by `<id>@<version>`. */
  fieldsByVersion: Map<string, InlineField[]>;
}

export const templateVersionKey = (id: string, version: number) => `${id}@${version}`;

export interface BuildMergeFieldsArgs {
  /** An existing destination first, then the rest oldest first. */
  orderedCases: Case[];
  destination?: Case;
  requestFields?: MergeFieldsRequest;
  customFieldsConfiguration: CustomFieldsConfiguration;
  /** Template field keys mirrored from a legacy custom field; the custom field row covers them. */
  linkedStorageKeys: ReadonlySet<string>;
  templates: MergeTemplates;
  globalFields: InlineField[];
  canChangeAssignees: boolean;
  assigneesUnavailableReason: 'license' | 'privilege' | null;
}

/** The values the destination ends up with. */
export interface MergeFieldValues {
  title: string;
  description: string;
  severity: CaseSeverity;
  category: string | null;
  tags: string[];
  /** Only meaningful when assignees can change. */
  assignees: CaseUserProfile[];
  connector: CaseConnector;
  /** Configured legacy custom fields, by key. */
  customFields: CaseCustomFields;
  template: { id: string; version: number } | null;
  /** Template and global field values that are not empty, by storage key. */
  extendedFields: Record<string, string>;
}

export interface MergeFieldsResult {
  fields: Fields;
  effectiveTemplate: { id: string; version: number; name: string } | null;
  conflicts: MergeConflict[];
  limits: MergeLimit[];
  values: MergeFieldValues;
}

const SEVERITY_RANK: Record<CaseSeverity, number> = {
  [CaseSeverity.LOW]: 0,
  [CaseSeverity.MEDIUM]: 1,
  [CaseSeverity.HIGH]: 2,
  [CaseSeverity.CRITICAL]: 3,
};

interface ValueOption<T> {
  value: T;
  caseIds: string[];
}

const collectOptions = <T>(
  orderedCases: Case[],
  getValue: (theCase: Case) => T,
  isEmpty: (value: T) => boolean,
  toComparable: (value: T) => unknown = (value) => value
): Array<ValueOption<T>> =>
  orderedCases.reduce<Array<ValueOption<T>>>((options, theCase) => {
    const value = getValue(theCase);
    if (isEmpty(value)) {
      return options;
    }
    const existing = options.find((option) =>
      isEqual(toComparable(option.value), toComparable(value))
    );
    if (existing) {
      existing.caseIds.push(theCase.id);
      return options;
    }
    return [...options, { value, caseIds: [theCase.id] }];
  }, []);

interface SingleValueField<T> {
  value: T;
  provenance: MergeFieldProvenance;
  sourceCaseId: string | null;
  options: Array<ValueOption<T>>;
  hasConflict: boolean;
}

interface SingleValueFieldArgs<T> {
  orderedCases: Case[];
  destination?: Case;
  getValue: (theCase: Case) => T;
  isEmpty: (value: T) => boolean;
  emptyValue: T;
  toComparable?: (value: T) => unknown;
  /** Picks the suggestion when the values differ; defaults to the destination's, else the oldest. */
  pickSuggestion?: (options: Array<ValueOption<T>>) => {
    option: ValueOption<T>;
    provenance: MergeFieldProvenance;
  };
}

/**
 * A conflict exists only when two or more cases hold different non-empty values. The suggestion is
 * the existing destination's value, else `pickSuggestion`, else the oldest case's value; an empty
 * destination field is filled from the oldest source that holds one.
 */
export const buildSingleValueField = <T>({
  orderedCases,
  destination,
  getValue,
  isEmpty,
  emptyValue,
  toComparable,
  pickSuggestion,
}: SingleValueFieldArgs<T>): SingleValueField<T> => {
  const options = collectOptions(orderedCases, getValue, isEmpty, toComparable);

  if (options.length === 0) {
    return {
      value: emptyValue,
      provenance: 'none',
      sourceCaseId: null,
      options,
      hasConflict: false,
    };
  }

  if (options.length === 1) {
    const [option] = options;
    return {
      value: option.value,
      provenance: option.caseIds.length === orderedCases.length ? 'same' : 'only',
      sourceCaseId: option.caseIds.length === 1 ? option.caseIds[0] : null,
      options,
      hasConflict: false,
    };
  }

  const destinationOption =
    destination != null && pickSuggestion == null
      ? options.find((option) => option.caseIds.includes(destination.id))
      : undefined;
  const picked =
    destinationOption != null
      ? { option: destinationOption, provenance: 'destination' as const }
      : pickSuggestion?.(options) ?? { option: options[0], provenance: 'oldest' as const };

  return {
    value: picked.option.value,
    provenance: picked.provenance,
    sourceCaseId:
      picked.provenance === 'destination' && destination != null
        ? destination.id
        : picked.option.caseIds[0],
    options,
    hasConflict: true,
  };
};

const combineValues = <T>(
  orderedCases: Case[],
  getValues: (theCase: Case) => T[],
  getKey: (value: T) => string
): { value: T[]; provenance: MergeFieldProvenance } => {
  const seen = new Set<string>();
  const combined: T[] = [];
  for (const theCase of orderedCases) {
    for (const value of getValues(theCase)) {
      const key = getKey(value);
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(value);
      }
    }
  }

  const keysPerCase = orderedCases.map((theCase) => getValues(theCase).map(getKey).sort());
  const allSame = keysPerCase.every((keys) => isEqual(keys, keysPerCase[0]));
  return {
    value: combined,
    provenance: combined.length === 0 ? 'none' : allSame ? 'same' : 'combined',
  };
};

const isEmptyString = (value: string | null | undefined) =>
  value == null || value.trim().length === 0;

const caseLabel = ({ incremental_id: incrementalId, title }: Case) =>
  incrementalId != null ? `#${incrementalId}` : title;

/** Every case's description, each under the case it comes from, when that fits the limit. */
const combineDescriptions = (
  orderedCases: Case[],
  options: Array<ValueOption<string>>
): string | null => {
  if (options.length < 2) {
    return null;
  }
  const combined = options
    .map(({ value, caseIds }) => {
      const from = caseIds
        .map((caseId) => orderedCases.find(({ id }) => id === caseId))
        .filter((theCase): theCase is Case => theCase != null)
        .map(caseLabel)
        .join(', ');
      return `From ${from}:\n\n${value}`;
    })
    .join('\n\n---\n\n');
  return combined.length <= MAX_DESCRIPTION_LENGTH ? combined : null;
};

const toConnectorComparable = ({ id, type, fields }: CaseConnector) => ({ id, type, fields });

const differentValuesConflict = (
  field: MergeConflict['field'],
  resolved: boolean,
  extra: Pick<MergeConflict, 'key' | 'label'> = {}
): MergeConflict => ({ field, ...extra, reason: 'differentValues', resolved });

const isMultiValueField = (field: InlineField) =>
  field.control === FieldType.CHECKBOX_GROUP ||
  (field.control === FieldType.USER_PICKER &&
    (field.metadata as { multiple?: boolean } | undefined)?.multiple === true);

const parseJsonArray = (value: string): unknown[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const multiValueKey = (item: unknown): string =>
  typeof item === 'string'
    ? item
    : typeof item === 'object' && item != null && 'uid' in item
    ? String((item as { uid: unknown }).uid)
    : JSON.stringify(item);

const isEmptyExtendedValue = (value: string | undefined) =>
  value == null || value === '' || value === '[]';

const getStoredExtendedValue = (theCase: Case, key: string) => theCase.extended_fields?.[key];

/** Fields the destination's template and the global fields define, global winning on a key collision. */
const getApplicableFields = (
  templateFields: InlineField[],
  globalFields: InlineField[]
): Array<{ field: InlineField; isGlobal: boolean }> => {
  const byKey = new Map<string, { field: InlineField; isGlobal: boolean }>();
  for (const field of templateFields.filter((f) => !isDisplayOnlyField(f))) {
    byKey.set(getFieldSnakeKey(field.name, field.type), { field, isGlobal: false });
  }
  for (const field of globalFields.filter((f) => !isDisplayOnlyField(f))) {
    byKey.set(getFieldSnakeKey(field.name, field.type), { field, isGlobal: true });
  }
  return [...byKey.values()];
};

const buildTemplateField = (
  {
    orderedCases,
    destination,
    requestFields,
    templates,
  }: Pick<BuildMergeFieldsArgs, 'orderedCases' | 'destination' | 'requestFields' | 'templates'>,
  conflicts: MergeConflict[]
): {
  field: Fields['template'];
  effective: { id: string; version: number; name: string } | null;
} => {
  const candidates = [...templates.candidates.values()];
  const toOption = (id: string): MergeTemplateOption => {
    const candidate = templates.candidates.get(id);
    return { id, name: candidate?.name ?? id, isEnabled: candidate?.isEnabled ?? false };
  };

  const options = collectOptions(
    orderedCases,
    (theCase) => theCase.template?.id ?? null,
    (id) => id == null
  ).map(({ value, caseIds }) => ({ value: toOption(value as string), caseIds }));

  const destinationTemplateId = destination?.template?.id;
  let suggestion: { option: MergeTemplateOption | null; provenance: MergeFieldProvenance };
  if (destinationTemplateId != null) {
    suggestion = { option: toOption(destinationTemplateId), provenance: 'destination' };
  } else {
    // The template most sources use, ties going to the oldest case's. A disabled one can't be applied.
    const enabled = options.filter(({ value }) => value.isEnabled);
    const mostUsed = enabled.reduce<(typeof enabled)[number] | undefined>(
      (best, option) =>
        best == null || option.caseIds.length > best.caseIds.length ? option : best,
      undefined
    );
    suggestion =
      mostUsed != null
        ? {
            option: mostUsed.value,
            provenance:
              options.length === 1 && mostUsed.caseIds.length === orderedCases.length
                ? 'same'
                : options.length === 1
                ? 'only'
                : 'mostUsed',
          }
        : { option: null, provenance: 'none' };
  }

  const hasConflict = options.length > 1;
  const resolved = requestFields?.template !== undefined;
  if (hasConflict) {
    conflicts.push(differentValuesConflict('template', resolved));
  }

  let chosenId: string | null;
  if (requestFields?.template === undefined) {
    chosenId = suggestion.option?.id ?? null;
  } else if (requestFields.template === null) {
    chosenId = null;
  } else {
    const { id } = requestFields.template;
    const candidate = templates.candidates.get(id);
    if (candidate == null || (!candidate.isEnabled && id !== destinationTemplateId)) {
      throw Boom.badRequest(
        `Template ${id} cannot be applied: pick one of the templates the cases use, or none.`
      );
    }
    chosenId = id;
  }

  const effective =
    chosenId == null
      ? null
      : {
          id: chosenId,
          // The destination keeps its own template at the version it pinned.
          version:
            chosenId === destinationTemplateId && destination?.template != null
              ? destination.template.version
              : templates.candidates.get(chosenId)?.version ?? 1,
          name: templates.candidates.get(chosenId)?.name ?? chosenId,
        };

  return {
    field: {
      value: suggestion.option,
      provenance: suggestion.provenance,
      sourceCaseId:
        suggestion.provenance === 'destination'
          ? destination?.id ?? null
          : options.find(({ value }) => value.id === suggestion.option?.id)?.caseIds[0] ?? null,
      options,
      hasConflict,
      candidates,
    },
    effective,
  };
};

const buildCustomFields = (
  {
    orderedCases,
    destination,
    requestFields,
    customFieldsConfiguration,
  }: Pick<
    BuildMergeFieldsArgs,
    'orderedCases' | 'destination' | 'requestFields' | 'customFieldsConfiguration'
  >,
  conflicts: MergeConflict[]
): { rows: MergeCustomFieldPreview[]; values: CaseCustomFields } => {
  const requested = new Map((requestFields?.customFields ?? []).map((field) => [field.key, field]));
  const rows: MergeCustomFieldPreview[] = [];
  const values: CaseCustomFields = [];

  for (const { key, type, label, required } of customFieldsConfiguration) {
    const row = buildSingleValueField<string | number | boolean | null>({
      orderedCases,
      destination,
      getValue: (theCase) => theCase.customFields.find((field) => field.key === key)?.value ?? null,
      isEmpty: (value) => value == null || value === '',
      emptyValue: null,
    });
    const requestedField = requested.get(key);
    const resolved = requestedField !== undefined;
    rows.push({ ...row, key, type, label, required: required === true });

    if (row.hasConflict) {
      conflicts.push(differentValuesConflict('customFields', resolved, { key, label }));
    }

    const value = resolved ? requestedField.value : row.value;
    if (required === true && (value == null || value === '')) {
      conflicts.push({ field: 'customFields', key, label, reason: 'required', resolved: false });
    }
    values.push({ key, type, value } as CaseCustomFields[number]);
  }

  return { rows, values };
};

const buildExtendedFields = (
  {
    orderedCases,
    destination,
    requestFields,
    linkedStorageKeys,
    globalFields,
  }: Pick<
    BuildMergeFieldsArgs,
    'orderedCases' | 'destination' | 'requestFields' | 'linkedStorageKeys' | 'globalFields'
  >,
  templateFields: InlineField[],
  conflicts: MergeConflict[]
): {
  rows: MergeExtendedFieldPreview[];
  values: Record<string, string>;
  notCopiedFields: Fields['notCopiedFields'];
} => {
  const applicable = getApplicableFields(templateFields, globalFields).filter(
    ({ field }) => !linkedStorageKeys.has(getFieldSnakeKey(field.name, field.type))
  );
  const defaults = buildExtendedFieldsDefaults(applicable.map(({ field }) => field));
  const requested = requestFields?.extendedFields ?? {};
  const values: Record<string, string> = {};
  const draftRows: Array<Omit<MergeExtendedFieldPreview, 'errors'>> = [];

  for (const { field, isGlobal } of applicable) {
    const key = getFieldSnakeKey(field.name, field.type);
    const label = field.label ?? field.name;
    const multiValue = isMultiValueField(field);
    let row: SingleValueField<string>;

    if (multiValue) {
      const combined = combineValues(
        orderedCases,
        (theCase) => {
          const stored = getStoredExtendedValue(theCase, key);
          return isEmptyExtendedValue(stored) ? [] : parseJsonArray(stored as string);
        },
        multiValueKey
      );
      const options = collectOptions(
        orderedCases,
        (theCase) => getStoredExtendedValue(theCase, key) ?? '',
        isEmptyExtendedValue
      );
      row = {
        value: combined.value.length > 0 ? JSON.stringify(combined.value) : defaults[key] ?? '',
        provenance:
          combined.value.length > 0
            ? combined.provenance
            : isEmptyExtendedValue(defaults[key])
            ? 'none'
            : 'templateDefault',
        sourceCaseId: null,
        options,
        hasConflict: false,
      };
    } else {
      row = buildSingleValueField<string>({
        orderedCases,
        destination,
        getValue: (theCase) => getStoredExtendedValue(theCase, key) ?? '',
        isEmpty: isEmptyExtendedValue,
        emptyValue: '',
      });
      if (row.provenance === 'none' && !isEmptyExtendedValue(defaults[key])) {
        row = { ...row, value: defaults[key], provenance: 'templateDefault' };
      }
    }

    const resolved = requested[key] !== undefined;
    if (row.hasConflict) {
      conflicts.push(differentValuesConflict('extendedFields', resolved, { key, label }));
    }
    const value = resolved ? requested[key] : row.value;
    if (!isEmptyExtendedValue(value)) {
      values[key] = value;
    }

    draftRows.push({
      ...row,
      key,
      name: field.name,
      label,
      control: field.control,
      multiValue,
      required: field.validation?.required === true,
      isGlobal,
    });
  }

  const issues = getExtendedFieldIssues(
    values,
    applicable.map(({ field }) => field)
  );
  const issuesByKey = new Map<string, string[]>();
  for (const { key, reason, message } of issues) {
    issuesByKey.set(key, [...(issuesByKey.get(key) ?? []), message]);
    const row = draftRows.find((draft) => draft.key === key);
    conflicts.push({
      field: 'extendedFields',
      key,
      label: row?.label,
      reason: reason === 'required' ? 'required' : 'invalidValue',
      message,
      resolved: false,
    });
  }

  // Template fields the sources hold that the destination's template does not define stay on them.
  const applicableKeys = new Set(
    applicable.map(({ field }) => getFieldSnakeKey(field.name, field.type))
  );
  const notCopied = new Map<string, string[]>();
  for (const theCase of orderedCases.filter(({ id }) => id !== destination?.id)) {
    Object.entries(theCase.extended_fields ?? {})
      .filter(
        ([key, value]) =>
          !applicableKeys.has(key) && !linkedStorageKeys.has(key) && !isEmptyExtendedValue(value)
      )
      .forEach(([key]) => notCopied.set(key, [...(notCopied.get(key) ?? []), theCase.id]));
  }

  return {
    rows: draftRows.map((row) => ({ ...row, errors: issuesByKey.get(row.key) ?? [] })),
    values,
    notCopiedFields: [...notCopied].map(([key, caseIds]) => ({
      key,
      label: key.replace(/_as_[a-z0-9_]+$/, ''),
      caseIds,
    })),
  };
};

/**
 * Works out the destination's field values: the suggestion per field, the conflicts the request
 * must settle, and the values the merge writes. Pure: everything it needs is passed in.
 */
export const buildMergeFields = (args: BuildMergeFieldsArgs): MergeFieldsResult => {
  const {
    orderedCases,
    destination,
    requestFields,
    templates,
    canChangeAssignees,
    assigneesUnavailableReason,
  } = args;
  const conflicts: MergeConflict[] = [];
  const isSent = (field: keyof MergeFieldsRequest) => requestFields?.[field] !== undefined;

  const title = buildSingleValueField<string>({
    orderedCases,
    destination,
    getValue: ({ title: value }) => value,
    isEmpty: isEmptyString,
    emptyValue: '',
  });
  const descriptionField = buildSingleValueField<string>({
    orderedCases,
    destination,
    getValue: ({ description }) => description,
    isEmpty: isEmptyString,
    emptyValue: '',
  });
  const description = {
    ...descriptionField,
    combinedValue: combineDescriptions(orderedCases, descriptionField.options),
  };
  const severity = buildSingleValueField<CaseSeverity>({
    orderedCases,
    destination,
    getValue: ({ severity: value }) => value,
    isEmpty: () => false,
    emptyValue: CaseSeverity.LOW,
    // Highest, the destination's own included.
    pickSuggestion: (options) => ({
      option: options.reduce((highest, option) =>
        SEVERITY_RANK[option.value] > SEVERITY_RANK[highest.value] ? option : highest
      ),
      provenance: 'highest',
    }),
  });
  const category = buildSingleValueField<string | null>({
    orderedCases,
    destination,
    getValue: ({ category: value }) => value ?? null,
    isEmpty: isEmptyString,
    emptyValue: null,
  });
  const connector = buildSingleValueField<CaseConnector>({
    orderedCases,
    destination,
    getValue: ({ connector: value }) => value,
    isEmpty: (value) => value == null || value.type === ConnectorTypes.none,
    emptyValue: getNoneConnector(),
    toComparable: toConnectorComparable,
  });

  for (const [field, row] of [
    ['title', title],
    ['description', description],
    ['severity', severity],
    ['category', category],
    ['connector', connector],
  ] as const) {
    if (row.hasConflict) {
      conflicts.push(differentValuesConflict(field, isSent(field)));
    }
  }

  const tags = combineValues(
    orderedCases,
    ({ tags: value }) => value,
    (tag) => tag
  );
  const combinedAssignees = combineValues<CaseUserProfile>(
    orderedCases,
    ({ assignees }) => assignees.map(({ uid }) => ({ uid })),
    ({ uid }) => uid
  );
  const assigneesValue = canChangeAssignees
    ? combinedAssignees
    : {
        value: destination?.assignees.map(({ uid }) => ({ uid })) ?? [],
        provenance: (destination?.assignees.length ?? 0) > 0 ? 'destination' : 'none',
      };

  // With the templates feature off, templates are left as they are.
  const { field: template, effective: effectiveTemplate } = templates.enabled
    ? buildTemplateField(args, conflicts)
    : {
        field: {
          value: null,
          provenance: 'none' as const,
          sourceCaseId: null,
          options: [],
          hasConflict: false,
          candidates: [],
        },
        effective:
          destination?.template != null
            ? { ...destination.template, name: destination.template.id }
            : null,
      };
  const templateFields =
    templates.enabled && effectiveTemplate != null
      ? templates.fieldsByVersion.get(
          templateVersionKey(effectiveTemplate.id, effectiveTemplate.version)
        ) ?? []
      : [];
  const customFields = buildCustomFields(args, conflicts);
  const extendedFields = templates.enabled
    ? buildExtendedFields(args, templateFields, conflicts)
    : { rows: [], values: {}, notCopiedFields: [] };

  const finalTags = requestFields?.tags ?? tags.value;
  const finalAssignees = requestFields?.assignees ?? (assigneesValue.value as CaseUserProfile[]);
  const limits: MergeLimit[] = [];
  if (finalTags.length > MAX_TAGS_PER_CASE) {
    limits.push({
      kind: 'tags',
      max: MAX_TAGS_PER_CASE,
      total: finalTags.length,
      overBy: finalTags.length - MAX_TAGS_PER_CASE,
    });
  }
  if (canChangeAssignees && finalAssignees.length > MAX_ASSIGNEES_PER_CASE) {
    limits.push({
      kind: 'assignees',
      max: MAX_ASSIGNEES_PER_CASE,
      total: finalAssignees.length,
      overBy: finalAssignees.length - MAX_ASSIGNEES_PER_CASE,
    });
  }

  const fields: Fields = {
    title,
    description,
    severity,
    category,
    connector,
    template,
    customFields: customFields.rows,
    extendedFields: extendedFields.rows,
    tags: {
      ...tags,
      max: MAX_TAGS_PER_CASE,
      overBy: Math.max(0, tags.value.length - MAX_TAGS_PER_CASE),
    },
    assignees: {
      value: assigneesValue.value as CaseUserProfile[],
      provenance: assigneesValue.provenance as MergeFieldProvenance,
      max: MAX_ASSIGNEES_PER_CASE,
      overBy: Math.max(0, assigneesValue.value.length - MAX_ASSIGNEES_PER_CASE),
      canChange: canChangeAssignees,
      unavailableReason: canChangeAssignees ? null : assigneesUnavailableReason,
    },
    notCopiedFields: extendedFields.notCopiedFields,
  };

  return {
    fields,
    effectiveTemplate,
    conflicts,
    limits,
    values: {
      title: requestFields?.title ?? title.value,
      description: requestFields?.description ?? description.value,
      severity: requestFields?.severity ?? severity.value,
      category: requestFields?.category !== undefined ? requestFields.category : category.value,
      tags: finalTags,
      assignees: finalAssignees,
      connector: requestFields?.connector ?? connector.value,
      customFields: customFields.values,
      template:
        effectiveTemplate == null
          ? null
          : { id: effectiveTemplate.id, version: effectiveTemplate.version },
      extendedFields: extendedFields.values,
    },
  };
};

/** Conflicts that block the merge: the request must settle every one of them. */
export const getUnresolvedConflicts = (conflicts: MergeConflict[]) =>
  conflicts.filter(({ resolved }) => !resolved);
