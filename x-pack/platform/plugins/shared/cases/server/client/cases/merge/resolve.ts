/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_MERGE_RESOLVE_REASON_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../../../common/constants';
import { CASES_API_ERROR_CODES } from '../../../../common/constants/error_codes';
import type {
  MergeCasesPreviewRequest,
  MergeCasesPreviewResponse,
  MergeCasesResolveRequest,
  MergeCasesResolveResponse,
  MergeConflict,
  MergeFieldsRequest,
  MergeResolveReason,
} from '../../../../common/types/api';
import {
  MergeCasesResolveRequestSchema,
  MergeCasesResolveResponseSchema,
} from '../../../../common/types/api';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { createTypedApiError } from '../../../common/api_errors';
import { createCaseError } from '../../../common/error';
import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from '../../../common/runtime_types';
import type { CasesClient } from '../../client';
import type { CasesClientArgs } from '../../types';
import type { MergeDisplayValue } from './describe';
import { formatMergeValue } from './describe';
import type { MergeResolveDecided, MergeResolvePromptField } from './resolve_prompt';
import {
  MERGE_RESOLVE_SYSTEM_PROMPT,
  MergeResolveOutputSchema,
  buildMergeResolveInput,
  getMergeResolveSchema,
} from './resolve_prompt';

const OPERATION_ID = 'cases_merge_resolve';

const SINGLE_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  severity: 'Severity',
  category: 'Category',
  connector: 'External connector',
  template: 'Template',
};

export interface MergeResolveOptions {
  abortSignal?: AbortSignal;
}

/** The model's choice for one field: an option by index, or text it wrote. */
interface ModelChoice {
  option?: number;
  text?: string;
}

/** A field the model can settle, and how its answer becomes request fields. */
interface ResolvableField {
  prompt: MergeResolvePromptField;
  conflict: Pick<MergeConflict, 'field' | 'key'>;
  toFields: (choice: ModelChoice) => MergeFieldsRequest | undefined;
}

interface ResolveResult {
  fields: MergeFieldsRequest;
  reasons: MergeResolveReason[];
}

/** `title`, `customFields.<key>` or `extendedFields.<key>`, as the UI names fields. */
const getFieldId = ({ field, key }: Pick<MergeConflict, 'field' | 'key'>): string =>
  field === 'customFields' || field === 'extendedFields' ? `${field}.${key ?? ''}` : field;

const pickOption = <T>(options: T[], { option }: ModelChoice): T | undefined =>
  option != null && Number.isInteger(option) && option >= 0 && option < options.length
    ? options[option]
    : undefined;

/** Text the model wrote, when it fits; anything longer is dropped, not cut. */
const pickText = ({ text }: ModelChoice, maxLength: number): string | undefined => {
  const trimmed = text?.trim();
  return trimmed != null && trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : undefined;
};

const toRequestCustomField = (
  key: string,
  type: string,
  value: string | number | boolean | null
): NonNullable<MergeFieldsRequest['customFields']>[number] | undefined => {
  switch (type) {
    case CustomFieldTypes.TEXT:
      return typeof value === 'string' ? { key, type: CustomFieldTypes.TEXT, value } : undefined;
    case CustomFieldTypes.TOGGLE:
      return typeof value === 'boolean' ? { key, type: CustomFieldTypes.TOGGLE, value } : undefined;
    case CustomFieldTypes.NUMBER:
      return typeof value === 'number' ? { key, type: CustomFieldTypes.NUMBER, value } : undefined;
    default:
      return undefined;
  }
};

/** A free-text field: the model picks a case's value or writes one within `maxLength`. */
const getTextField = (
  preview: MergeCasesPreviewResponse,
  key: 'title' | 'description',
  maxLength: number
): ResolvableField => {
  const { options } = preview.fields[key];
  return {
    prompt: {
      id: key,
      label: SINGLE_FIELD_LABELS[key],
      maxTextLength: maxLength,
      options,
    },
    conflict: { field: key },
    toFields: (choice) => {
      const value = pickText(choice, maxLength) ?? pickOption(options, choice)?.value;
      if (value == null) {
        return undefined;
      }
      return key === 'title' ? { title: value } : { description: value };
    },
  };
};

/** The field the conflict is about, when the model can settle it from the cases' values. */
const getResolvableField = (
  preview: MergeCasesPreviewResponse,
  conflict: MergeConflict
): ResolvableField | undefined => {
  const { fields } = preview;
  const id = getFieldId(conflict);
  const label = conflict.label ?? SINGLE_FIELD_LABELS[conflict.field] ?? id;

  switch (conflict.field) {
    case 'title':
      return getTextField(preview, 'title', MAX_TITLE_LENGTH);
    case 'description':
      return getTextField(preview, 'description', MAX_DESCRIPTION_LENGTH);
    case 'severity': {
      const { options } = fields.severity;
      return {
        prompt: {
          id,
          label,
          details: 'From lowest to highest: low, medium, high, critical.',
          options,
        },
        conflict,
        toFields: (choice) => {
          const option = pickOption(options, choice);
          return option != null ? { severity: option.value } : undefined;
        },
      };
    }
    case 'category': {
      const { options } = fields.category;
      return {
        prompt: { id, label, options },
        conflict,
        toFields: (choice) => {
          const option = pickOption(options, choice);
          return option != null ? { category: option.value } : undefined;
        },
      };
    }
    case 'connector': {
      const { options } = fields.connector;
      return {
        prompt: { id, label, details: 'Where the case is pushed.', options },
        conflict,
        toFields: (choice) => {
          const option = pickOption(options, choice);
          return option != null ? { connector: option.value } : undefined;
        },
      };
    }
    case 'template': {
      // A deleted or disabled template can't be applied.
      const options = fields.template.options.filter(({ value }) => value?.isEnabled === true);
      return {
        prompt: {
          id,
          label,
          details: 'The template decides which template fields the merged case has.',
          options,
        },
        conflict,
        toFields: (choice) => {
          const template = pickOption(options, choice)?.value;
          return template != null ? { template: { id: template.id } } : undefined;
        },
      };
    }
    case 'customFields': {
      const row = fields.customFields.find(({ key }) => key === conflict.key);
      if (row == null) {
        return undefined;
      }
      const options = row.options.filter(({ invalid }) => invalid == null);
      return {
        prompt: { id, label: row.label, details: `A ${row.type} field.`, options },
        conflict,
        toFields: (choice) => {
          const option = pickOption(options, choice);
          const customField =
            option != null ? toRequestCustomField(row.key, row.type, option.value) : undefined;
          return customField != null ? { customFields: [customField] } : undefined;
        },
      };
    }
    case 'extendedFields': {
      const row = fields.extendedFields.find(({ key }) => key === conflict.key);
      // Multi-value fields are combined and never need a choice.
      if (row == null || row.multiValue) {
        return undefined;
      }
      const options = row.options.filter(({ invalid }) => invalid == null);
      const allowed = row.definition.options;
      return {
        prompt: {
          id,
          label: row.label,
          details: `A ${row.control} field${
            allowed != null && allowed.length > 0 ? ` allowing ${allowed.join(', ')}` : ''
          }.`,
          options: options.map(({ value, caseIds }) => ({ value, caseIds })),
        },
        conflict,
        toFields: (choice) => {
          const option = pickOption(options, choice);
          return option != null ? { extendedFields: { [row.key]: option.value } } : undefined;
        },
      };
    }
    default:
      return undefined;
  }
};

/**
 * The conflicts the model is asked about: those the request doesn't settle, that the user can see
 * (template fields wait for the template), and that have a value the model can give.
 */
export const getResolvableFields = (
  preview: MergeCasesPreviewResponse,
  templateDecided: boolean
): ResolvableField[] =>
  preview.conflicts.flatMap((conflict) => {
    if (conflict.resolved) {
      return [];
    }
    if (conflict.field === 'extendedFields') {
      const row = preview.fields.extendedFields.find(({ key }) => key === conflict.key);
      if (!(row?.isGlobal ?? false) && !templateDecided) {
        return [];
      }
    }
    const field = getResolvableField(preview, conflict);
    const canAnswer =
      field != null && (field.prompt.maxTextLength != null || field.prompt.options.length > 0);
    return canAnswer ? [field] : [];
  });

/** Combines request fields; `next` wins, and custom fields combine by key. */
export const combineMergeFields = (
  base: MergeFieldsRequest | undefined,
  next: MergeFieldsRequest
): MergeFieldsRequest => {
  const customFields = new Map(
    [...(base?.customFields ?? []), ...(next.customFields ?? [])].map((field) => [field.key, field])
  );
  const extendedFields = { ...(base?.extendedFields ?? {}), ...(next.extendedFields ?? {}) };
  return {
    ...base,
    ...next,
    ...(customFields.size > 0 ? { customFields: [...customFields.values()] } : {}),
    ...(Object.keys(extendedFields).length > 0 ? { extendedFields } : {}),
  };
};

/** The fields without the ones named, so a later answer can replace them or leave them open. */
const omitFieldIds = (fields: MergeFieldsRequest, ids: ReadonlySet<string>): MergeFieldsRequest => {
  const { customFields, extendedFields, ...single } = fields;
  const kept: MergeFieldsRequest = { ...single };
  for (const key of Object.keys(single) as Array<keyof typeof single>) {
    if (ids.has(key)) {
      delete kept[key];
    }
  }
  const keptCustom = (customFields ?? []).filter(({ key }) => !ids.has(`customFields.${key}`));
  const keptExtended = Object.entries(extendedFields ?? {}).filter(
    ([key]) => !ids.has(`extendedFields.${key}`)
  );
  return {
    ...kept,
    ...(keptCustom.length > 0 ? { customFields: keptCustom } : {}),
    ...(keptExtended.length > 0 ? { extendedFields: Object.fromEntries(keptExtended) } : {}),
  };
};

const getInferenceClient = async (
  inference: InferenceServerStart | undefined,
  request: KibanaRequest,
  connectorId: string | undefined
): Promise<BoundInferenceClient> => {
  const resolvedConnectorId =
    connectorId ??
    (inference != null
      ? await inference
          .getDefaultConnector(request)
          .then((connector) => connector?.connectorId)
          .catch(() => undefined)
      : undefined);

  if (inference == null || resolvedConnectorId == null) {
    throw createTypedApiError({
      statusCode: 400,
      message: 'No AI connector is available to resolve the merge.',
      attributes: { code: CASES_API_ERROR_CODES.MERGE_RESOLVE_NO_AI_CONNECTOR },
    });
  }

  return inference.getClient({ request, bindTo: { connectorId: resolvedConnectorId } });
};

/** Asks the model about the fields once and keeps the answers that map to a valid value. */
const askModel = async ({
  client,
  preview,
  resolvable,
  decided,
  abortSignal,
}: {
  client: BoundInferenceClient;
  preview: MergeCasesPreviewResponse;
  resolvable: ResolvableField[];
  decided: MergeResolveDecided[];
  abortSignal?: AbortSignal;
}): Promise<ResolveResult> => {
  const byId = new Map(resolvable.map((field) => [field.prompt.id, field]));
  const { output } = await client.output({
    id: OPERATION_ID,
    system: MERGE_RESOLVE_SYSTEM_PROMPT,
    input: buildMergeResolveInput({
      preview,
      fields: resolvable.map(({ prompt }) => prompt),
      decided,
    }),
    schema: getMergeResolveSchema([...byId.keys()]),
    retry: { onValidationError: 1 },
    abortSignal,
  });

  const parsed = MergeResolveOutputSchema.safeParse(output);
  if (!parsed.success) {
    throw Boom.badGateway(
      `The AI answer did not match the expected shape: ${parsed.error.message}`
    );
  }

  let fields: MergeFieldsRequest = {};
  const reasons: MergeResolveReason[] = [];
  const answered = new Set<string>();
  for (const { id, option, text, reason } of parsed.data.resolutions) {
    const field = byId.get(id);
    // An unknown field, a second answer for a field, or a value that can't be used is dropped.
    const resolved = field != null && !answered.has(id) ? field.toFields({ option, text }) : null;
    if (field != null && resolved != null) {
      answered.add(id);
      fields = combineMergeFields(fields, resolved);
      reasons.push({
        field: field.conflict.field,
        ...(field.conflict.key != null ? { key: field.conflict.key } : {}),
        reason: reason.trim().slice(0, MAX_MERGE_RESOLVE_REASON_LENGTH),
      });
    }
  }

  return { fields, reasons };
};

/** What the first call settled, in words, for the second call. */
const describeDecided = (
  resolvable: ResolvableField[],
  { fields }: ResolveResult,
  preview: MergeCasesPreviewResponse
): MergeResolveDecided[] =>
  resolvable.flatMap(({ prompt, conflict }) => {
    let value: MergeDisplayValue | undefined;
    switch (conflict.field) {
      case 'template':
        value =
          fields.template != null
            ? preview.fields.template.candidates.find(({ id }) => id === fields.template?.id) ??
              null
            : undefined;
        break;
      case 'customFields':
        value = fields.customFields?.find(({ key }) => key === conflict.key)?.value;
        break;
      case 'extendedFields':
        value = conflict.key != null ? fields.extendedFields?.[conflict.key] : undefined;
        break;
      case 'connector':
        value = fields.connector;
        break;
      default:
        value = fields[conflict.field];
    }
    return value !== undefined ? [{ label: prompt.label, value: formatMergeValue(value) }] : [];
  });

/**
 * Asks an LLM for a value for every field the cases disagree on, for the user to check. It picks
 * one of the cases' values, except for the title and description, which it may write. A field it
 * can't settle is left out. When it picks the template, a second call settles the template's
 * fields, which only exist once the template is known. Writes nothing.
 */
export const mergeResolve = async (
  params: MergeCasesResolveRequest,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  { abortSignal }: MergeResolveOptions = {}
): Promise<MergeCasesResolveResponse> => {
  const {
    logger,
    inference,
    request,
    services: { licensingService },
  } = clientArgs;

  try {
    const { connectorId, ...previewRequest } = decodeWithExcessOrThrowZod(
      MergeCasesResolveRequestSchema
    )(params);

    if (!(await licensingService.isAtLeastEnterprise())) {
      throw Boom.forbidden('Resolving merge conflicts with AI requires an Enterprise license.');
    }

    const preview = await casesClient.cases.mergePreview(previewRequest);
    const templateDecided =
      !preview.fields.template.hasConflict || previewRequest.fields?.template !== undefined;
    const firstFields = getResolvableFields(preview, templateDecided);
    if (firstFields.length === 0) {
      return { fields: {}, reasons: [] };
    }

    const client = await getInferenceClient(inference, request, connectorId);
    const first = await askModel({
      client,
      preview,
      resolvable: firstFields,
      decided: [],
      abortSignal,
    });

    if (templateDecided || first.fields.template == null) {
      return decodeOrThrowZod(MergeCasesResolveResponseSchema)(first);
    }

    // The template is known now, so its fields can be settled too.
    const secondRequest: MergeCasesPreviewRequest = {
      ...previewRequest,
      fields: combineMergeFields(previewRequest.fields, first.fields),
    };
    const secondPreview = await casesClient.cases.mergePreview(secondRequest);
    const secondFields = getResolvableFields(secondPreview, true);
    if (secondFields.length === 0) {
      return decodeOrThrowZod(MergeCasesResolveResponseSchema)(first);
    }

    const second = await askModel({
      client,
      preview: secondPreview,
      resolvable: secondFields,
      decided: describeDecided(firstFields, first, preview),
      abortSignal,
    });
    // A field asked again (a value the template rejects) takes the second answer, or stays open.
    const askedAgain = new Set(secondFields.map(({ prompt }) => prompt.id));
    const reasonId = (reason: MergeResolveReason) => getFieldId(reason);

    return decodeOrThrowZod(MergeCasesResolveResponseSchema)({
      fields: combineMergeFields(omitFieldIds(first.fields, askedAgain), second.fields),
      reasons: [
        ...first.reasons.filter((reason) => !askedAgain.has(reasonId(reason))),
        ...second.reasons,
      ],
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to resolve merging cases [${(params.caseIds ?? []).join(
        ', '
      )}] with AI: ${error}`,
      error,
      logger,
    });
  }
};
