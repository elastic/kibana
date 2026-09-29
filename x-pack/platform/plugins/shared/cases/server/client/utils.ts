/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { get, isPlainObject, differenceWith, isEqual } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { validate as uuidValidate } from 'uuid';

import type { ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { KueryNode } from '@kbn/es-query';

import { nodeBuilder, fromKueryExpression, escapeKuery } from '@kbn/es-query';
import { spaceIdToNamespace } from '@kbn/spaces-plugin/server/lib/utils/namespace';

import { escapeQuotes } from '@kbn/es-query/src/kuery/utils/escape_kuery';
import type { FileJSON } from '@kbn/shared-ux-file-types';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common/constants';

import type {
  CaseCustomField,
  CaseSeverity,
  CaseStatuses,
  CustomFieldsConfiguration,
  TemplatesConfiguration,
  CustomFieldTypes,
} from '../../common/types/domain';
import type { SavedObjectFindOptionsKueryNode } from '../common/types';
import type { CasesSearchParams } from './types';

import {
  CASE_SAVED_OBJECT,
  FILE_ATTACHMENT_TYPE,
  NO_ASSIGNEES_FILTERING_KEYWORD,
  OWNER_FIELD,
} from '../../common/constants';
import { combineFilterWithAuthorizationFilter } from '../authorization/utils';
import { SEVERITY_EXTERNAL_TO_ESMODEL, STATUS_EXTERNAL_TO_ESMODEL } from '../common/constants';
import { isCommentRequestTypeAlert } from '../common/utils';
import type { UnifiedAttachmentPayload } from '../../common/types/domain/attachment/v2';
import type { AttachmentRequest, CasesFindRequestSortFields } from '../../common/types/api';
import type { ICasesCustomField } from '../custom_fields';
import { casesCustomFields } from '../custom_fields';

/**
 * Return the alert IDs from the comment if it is an alert style comment. Otherwise return an empty array.
 */
export const getAlertIds = (comment: AttachmentRequest): string[] => {
  if (isCommentRequestTypeAlert(comment)) {
    return Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
  }
  return [];
};

const addStatusFilter = (status: CaseStatuses | CaseStatuses[]): KueryNode | undefined => {
  if (Array.isArray(status)) {
    return buildFilter({
      filters: status.map((_status) => `${STATUS_EXTERNAL_TO_ESMODEL[_status]}`),
      field: 'status',
      operator: 'or',
    });
  }

  return nodeBuilder.is(
    `${CASE_SAVED_OBJECT}.attributes.status`,
    `${STATUS_EXTERNAL_TO_ESMODEL[status]}`
  );
};

const addSeverityFilter = (severity: CaseSeverity | CaseSeverity[]): KueryNode | undefined => {
  if (Array.isArray(severity)) {
    return buildFilter({
      filters: severity.map((_severity) => `${SEVERITY_EXTERNAL_TO_ESMODEL[_severity]}`),
      field: 'severity',
      operator: 'or',
    });
  }
  return nodeBuilder.is(
    `${CASE_SAVED_OBJECT}.attributes.severity`,
    `${SEVERITY_EXTERNAL_TO_ESMODEL[severity]}`
  );
};

const buildCategoryFilter = (categories: CasesSearchParams['category']): KueryNode | undefined => {
  if (categories === undefined) {
    return;
  }

  const categoriesAsArray = Array.isArray(categories) ? categories : [categories];

  if (categoriesAsArray.length === 0) {
    return;
  }

  const categoryFilters = categoriesAsArray.map((category) =>
    nodeBuilder.is(`${CASE_SAVED_OBJECT}.attributes.category`, `${category}`)
  );

  return nodeBuilder.or(categoryFilters);
};

export const NodeBuilderOperators = {
  and: 'and',
  or: 'or',
} as const;

type NodeBuilderOperatorsType = keyof typeof NodeBuilderOperators;

interface FilterField {
  filters?: string | string[];
  field: string;
  operator: NodeBuilderOperatorsType;
  type?: string;
}

export const buildFilter = ({
  filters,
  field,
  operator,
  type = CASE_SAVED_OBJECT,
}: FilterField): KueryNode | undefined => {
  if (filters === undefined) {
    return;
  }

  const filtersAsArray = Array.isArray(filters) ? filters : [filters];

  if (filtersAsArray.length === 0) {
    return;
  }

  return nodeBuilder[operator](
    filtersAsArray.map((filter) => nodeBuilder.is(`${type}.attributes.${field}`, filter))
  );
};

/**
 * Combines the authorized filters with the requested owners.
 */
export const combineAuthorizedAndOwnerFilter = (
  owner?: string[] | string,
  authorizationFilter?: KueryNode,
  savedObjectType?: string
): KueryNode | undefined => {
  const ownerFilter = buildFilter({
    filters: owner,
    field: OWNER_FIELD,
    operator: 'or',
    type: savedObjectType,
  });

  return combineFilterWithAuthorizationFilter(ownerFilter, authorizationFilter);
};

/**
 * Combines Kuery nodes and accepts an array with a mixture of undefined and KueryNodes. This will filter out the undefined
 * filters and return a KueryNode with the filters combined using the specified operator which defaults to and if not defined.
 */
export function combineFilters(
  nodes: Array<KueryNode | undefined>,
  operator: NodeBuilderOperatorsType = NodeBuilderOperators.and
): KueryNode | undefined {
  const filters = nodes.filter((node): node is KueryNode => node !== undefined);
  if (filters.length <= 0) {
    return;
  }
  return nodeBuilder[operator](filters);
}

/**
 * Creates a KueryNode from a string expression. Returns undefined if the expression is undefined.
 */
export function stringToKueryNode(expression?: string): KueryNode | undefined {
  if (!expression) {
    return;
  }

  return fromKueryExpression(expression);
}

export const buildRangeFilter = ({
  from,
  to,
  field = 'created_at',
  savedObjectType = CASE_SAVED_OBJECT,
}: {
  from?: string;
  to?: string;
  field?: string;
  savedObjectType?: string;
}): KueryNode | undefined => {
  if (from == null && to == null) {
    return;
  }

  try {
    const fromKQL =
      from != null
        ? `${escapeKuery(savedObjectType)}.attributes.${escapeKuery(field)} >= ${escapeKuery(from)}`
        : undefined;
    const toKQL =
      to != null
        ? `${escapeKuery(savedObjectType)}.attributes.${escapeKuery(field)} <= ${escapeKuery(to)}`
        : undefined;

    const rangeKQLQuery = `${fromKQL != null ? fromKQL : ''} ${
      fromKQL != null && toKQL != null ? 'and' : ''
    } ${toKQL != null ? toKQL : ''}`;

    return stringToKueryNode(rangeKQLQuery);
  } catch (error) {
    throw badRequest('Invalid "from" and/or "to" query parameters');
  }
};

export const buildAssigneesFilter = ({
  assignees,
}: {
  assignees: CasesSearchParams['assignees'];
}): KueryNode | undefined => {
  if (assignees === undefined) {
    return;
  }

  const assigneesAsArray = Array.isArray(assignees) ? assignees : [assignees];

  if (assigneesAsArray.length === 0) {
    return;
  }

  const assigneesWithoutNone = assigneesAsArray.filter(
    (assignee) => assignee !== NO_ASSIGNEES_FILTERING_KEYWORD
  );
  const hasNoneAssignee = assigneesAsArray.some(
    (assignee) => assignee === NO_ASSIGNEES_FILTERING_KEYWORD
  );

  const assigneesFilter = assigneesWithoutNone.map((filter) =>
    nodeBuilder.is(`${CASE_SAVED_OBJECT}.attributes.assignees.uid`, filter)
  );

  if (!hasNoneAssignee) {
    return nodeBuilder.or(assigneesFilter);
  }

  const filterCasesWithoutAssigneesKueryNode = fromKueryExpression(
    `not ${CASE_SAVED_OBJECT}.attributes.assignees.uid: *`
  );

  return nodeBuilder.or([...assigneesFilter, filterCasesWithoutAssigneesKueryNode]);
};

export const buildCustomFieldsFilter = ({
  customFields,
  customFieldsConfiguration,
}: {
  customFields: CasesSearchParams['customFields'];
  customFieldsConfiguration?: CustomFieldsConfiguration;
}): KueryNode | undefined => {
  if (!customFields || !customFieldsConfiguration?.length) {
    return;
  }

  const customFieldsMappings: Array<Record<string, ICasesCustomField>> = [];

  Object.keys(customFields).forEach((item: string) => {
    const customFieldConfig = customFieldsConfiguration.find((config) => config.key === item);

    if (!customFieldConfig) {
      return;
    }

    const mapping = casesCustomFields.get(customFieldConfig.type);

    if (!mapping) {
      return;
    }

    customFieldsMappings.push({ [item]: mapping });
  });

  if (!customFieldsMappings.length) {
    return;
  }

  const customFieldsFilter = Object.entries(customFields).map(([key, value]) => {
    const customFieldMapping = customFieldsMappings.find((mapping) => mapping[key]) ?? {};

    if (!Object.values(value).length) {
      return fromKueryExpression(`${CASE_SAVED_OBJECT}.attributes.customFields:{key: ${key}}`);
    }

    return nodeBuilder.or(
      Object.values(value).map((filterValue) => {
        if (filterValue === null) {
          return fromKueryExpression(
            `${CASE_SAVED_OBJECT}.attributes.customFields:{key: ${key} and (not value:*)}`
          );
        }

        return fromKueryExpression(
          `${CASE_SAVED_OBJECT}.attributes.customFields:{key: ${key} and value.${customFieldMapping[key].savedObjectMappingType}: ${filterValue}}`
        );
      })
    );
  });

  return nodeBuilder.and([...customFieldsFilter]);
};

/**
 * Helper function to remove .attributes from field paths in a KueryNode AST.
 * This is used when searchType is 'search' to convert find-style filters to search-style filters.
 */
export const removeAttributesFromFilter = (node: KueryNode): KueryNode => {
  // Create a deep copy to avoid mutating the original
  const modifiedNode = structuredClone(node);

  const traverse = (ast: KueryNode): void => {
    // Handle literal nodes with string values (field paths)
    if (ast.type === 'literal' && typeof ast.value === 'string') {
      ast.value = ast.value.replace(/\.attributes\./g, '.');
    }

    // Recursively traverse all arguments
    if (ast.arguments && Array.isArray(ast.arguments)) {
      ast.arguments.forEach((arg) => {
        if (arg) {
          traverse(arg);
        }
      });
    }
  };

  traverse(modifiedNode);
  return modifiedNode;
};

export const constructQueryOptions = ({
  tags,
  reporters,
  status,
  severity,
  sortField,
  owner,
  authorizationFilter,
  from,
  to,
  assignees,
  category,
  customFields,
  customFieldsConfiguration,
  searchType = 'find',
}: CasesSearchParams & {
  customFieldsConfiguration?: CustomFieldsConfiguration;
  searchType?: 'find' | 'search';
}): SavedObjectFindOptionsKueryNode => {
  const tagsFilter = buildFilter({ filters: tags, field: 'tags', operator: 'or' });
  const reportersFilter = createReportersFilter(reporters);
  const sortByField = convertSortField(sortField);
  const ownerFilter = buildFilter({ filters: owner, field: OWNER_FIELD, operator: 'or' });
  const statusFilter = status != null ? addStatusFilter(status) : undefined;
  const severityFilter = severity != null ? addSeverityFilter(severity) : undefined;
  const rangeFilter = buildRangeFilter({ from, to });
  const assigneesFilter = buildAssigneesFilter({ assignees });
  const categoryFilter = buildCategoryFilter(category);
  const customFieldsFilter = buildCustomFieldsFilter({ customFields, customFieldsConfiguration });

  const filters = combineFilters([
    statusFilter,
    severityFilter,
    tagsFilter,
    reportersFilter,
    rangeFilter,
    ownerFilter,
    assigneesFilter,
    categoryFilter,
    customFieldsFilter,
  ]);

  const combinedFilter = combineFilterWithAuthorizationFilter(filters, authorizationFilter);
  const finalFilter =
    searchType === 'search' && combinedFilter
      ? removeAttributesFromFilter(combinedFilter)
      : combinedFilter;

  return {
    filter: finalFilter,
    sortField: sortByField,
  };
};

const createReportersFilter = (reporters?: string | string[]): KueryNode | undefined => {
  const reportersFilter = buildFilter({
    filters: reporters,
    field: 'created_by.username',
    operator: 'or',
  });

  const reportersProfileUidFilter = buildFilter({
    filters: reporters,
    field: 'created_by.profile_uid',
    operator: 'or',
  });

  const filters = [reportersFilter, reportersProfileUidFilter].filter(
    (filter): filter is KueryNode => filter != null
  );

  if (filters.length <= 0) {
    return;
  }

  return nodeBuilder.or(filters);
};

interface CompareArrays<T> {
  addedItems: T[];
  deletedItems: T[];
}

export const arraysDifference = <T>(
  originalValue: T[] | undefined | null,
  updatedValue: T[] | undefined | null
): CompareArrays<T> | null => {
  if (
    originalValue != null &&
    updatedValue != null &&
    Array.isArray(updatedValue) &&
    Array.isArray(originalValue)
  ) {
    const addedItems = differenceWith(updatedValue, originalValue, isEqual);
    const deletedItems = differenceWith(originalValue, updatedValue, isEqual);

    if (addedItems.length > 0 || deletedItems.length > 0) {
      return {
        addedItems,
        deletedItems,
      };
    }
  }
  return null;
};

interface CaseWithIDVersion {
  id: string;
  version: string;

  [key: string]: unknown;
}

export const getCaseToUpdate = (
  currentCase: unknown,
  queryCase: CaseWithIDVersion
): CaseWithIDVersion =>
  Object.entries(queryCase).reduce<CaseWithIDVersion>(
    (acc, [key, value]) => {
      const currentValue = get(currentCase, key);
      if (Array.isArray(currentValue) && Array.isArray(value)) {
        if (arraysDifference(value, currentValue)) {
          acc[key] = value;
        }
      } else if (isPlainObject(value)) {
        if (currentValue === undefined || !deepEqual(currentValue, value)) {
          acc[key] = value;
        }
      } else if (currentValue !== undefined && value !== currentValue) {
        acc[key] = value;
      }
      return acc;
    },
    { id: queryCase.id, version: queryCase.version }
  );

/**
 * TODO: Backend is not connected with the
 * frontend in x-pack/platform/plugins/shared/cases/common/ui/types.ts.
 * It is easy to forget to update a sort field.
 * We should fix it and make it common.
 * Also the sortField in x-pack/platform/plugins/shared/cases/common/api/cases/case.ts
 * is set to string. We should narrow it to the
 * acceptable values
 */
enum SortFieldCase {
  closedAt = 'closed_at',
  createdAt = 'created_at',
  status = 'status',
  title = 'title.keyword',
  severity = 'severity',
  updatedAt = 'updated_at',
  category = 'category',
}

export const convertSortField = (
  sortField: CasesFindRequestSortFields | undefined
): SortFieldCase => {
  switch (sortField) {
    case 'status':
      return SortFieldCase.status;
    case 'createdAt':
      return SortFieldCase.createdAt;
    case 'closedAt':
      return SortFieldCase.closedAt;
    case 'title':
      return SortFieldCase.title;
    case 'severity':
      return SortFieldCase.severity;
    case 'updatedAt':
      return SortFieldCase.updatedAt;
    case 'category':
      return SortFieldCase.category;
    default:
      return SortFieldCase.createdAt;
  }
};

export const constructSearch = (
  search: string | undefined,
  spaceId: string,
  savedObjectsSerializer: ISavedObjectsSerializer
): { search: string; rootSearchFields?: string[] } | undefined => {
  if (!search) {
    return undefined;
  }

  if (uuidValidate(search)) {
    const rawId = savedObjectsSerializer.generateRawId(
      spaceIdToNamespace(spaceId),
      CASE_SAVED_OBJECT,
      search
    );

    return {
      search: `"${search}" "${rawId}"`,
      rootSearchFields: ['_id'],
    };
  }

  return { search };
};

/**
 * remove deleted custom field from template or add newly added custom field to template
 */
export const transformTemplateCustomFields = ({
  templates,
  customFields,
}: {
  templates?: TemplatesConfiguration;
  customFields?: CustomFieldsConfiguration;
}): TemplatesConfiguration => {
  if (!templates || !templates.length) {
    return [];
  }

  return templates.map((template) => {
    const templateCustomFields = template.caseFields?.customFields ?? [];

    if (!customFields || !customFields.length) {
      return { ...template, caseFields: { ...template.caseFields, customFields: [] } };
    }

    // remove deleted custom field from template
    const transformedTemplateCustomFields = templateCustomFields.filter((templateCustomField) =>
      customFields?.find((customField) => customField.key === templateCustomField.key)
    );

    // add new custom fields to template
    if (customFields.length >= transformedTemplateCustomFields.length) {
      customFields.forEach((field) => {
        if (
          !transformedTemplateCustomFields.find(
            (templateCustomField) => templateCustomField.key === field.key
          )
        ) {
          const { getDefaultValue } = casesCustomFields.get(field.type) ?? {};
          const value = getDefaultValue?.() ?? null;

          transformedTemplateCustomFields.push({
            key: field.key,
            type: field.type as CustomFieldTypes,
            value: field.defaultValue ?? value,
          } as CaseCustomField);
        }
      });
    }

    return {
      ...template,
      caseFields: { ...template.caseFields, customFields: transformedTemplateCustomFields },
    };
  });
};

export const buildObservablesFieldsFilter = (observables: Record<string, string[]>) => {
  // NOTE: empty observables mean that we should not construct the filter and it should lead
  // to early return in the calling context (it is required).
  if (!Object.keys(observables).length) {
    return;
  }

  const filterExpressions = Object.keys(observables).flatMap((typeKey) => {
    return Object.values(observables[typeKey]).map((observableValue) => {
      return fromKueryExpression(
        `cases.attributes.observables:{value: "${escapeQuotes(
          observableValue
        )}" AND typeKey: "${typeKey}"}`
      );
    });
  });

  return nodeBuilder.or(filterExpressions);
};

export const buildAttachmentRequestFromFileJSON = ({
  owner,
  fileMetadata,
}: {
  owner: string;
  fileMetadata: FileJSON;
}): UnifiedAttachmentPayload => ({
  owner,
  type: FILE_ATTACHMENT_TYPE,
  attachmentId: fileMetadata.id,
  metadata: {
    soType: FILE_SO_TYPE,
    files: [
      {
        name: fileMetadata.name,
        extension: fileMetadata.extension ?? 'txt',
        mimeType: fileMetadata.mimeType ?? 'text/plain',
        created: fileMetadata.created,
      },
    ],
  },
});
