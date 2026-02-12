/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateTemplateInput,
  ParsedTemplate,
  Template,
} from '../../../../common/types/domain/template/v1';
import {
  INTERNAL_BULK_DELETE_TEMPLATES_URL,
  INTERNAL_BULK_EXPORT_TEMPLATES_URL,
  INTERNAL_TEMPLATE_CREATORS_URL,
  INTERNAL_TEMPLATE_TAGS_URL,
  INTERNAL_TEMPLATE_DETAILS_URL,
  INTERNAL_TEMPLATES_URL,
} from '../../../../common/constants';
import { KibanaServices } from '../../../common/lib/kibana';
import { MOCK_TEMPLATES } from './sample_data';
import { templatesToYaml } from '../utils/templates_to_yaml';
import type {
  TemplatesFindResponse,
  TemplateUpdateRequest,
  BulkDeleteTemplatesResponse,
  BulkExportTemplatesResponse,
} from '../types';

export const postTemplate = async ({
  template,
  signal,
}: {
  template: CreateTemplateInput;
  signal?: AbortSignal;
}): Promise<Template> => {
  const response = await KibanaServices.get().http.fetch<Template>(INTERNAL_TEMPLATES_URL, {
    method: 'POST',
    body: JSON.stringify(template),
    signal,
  });
  return response;
};

export const getTemplates = async ({
  //   signal,
  queryParams,
}: {
  signal?: AbortSignal;
  queryParams: {
    page: number;
    perPage: number;
    search: string;
    sortField: string;
    sortOrder: 'asc' | 'desc';
  };
}): Promise<TemplatesFindResponse> => {
  const { page, perPage, search, sortField, sortOrder } = queryParams;

  // TODO: Replace with actual API call when available
  // const response = await KibanaServices.get().http.fetch<TemplatesFindResponse>(TEMPLATES_URL, {
  //   method: 'GET',
  //   query: { page, perPage, search, sortField, sortOrder },
  //   signal,
  // });
  // return response;

  // Return mock data
  const filteredTemplates = search
    ? MOCK_TEMPLATES.filter(
        (template) =>
          template.name.toLowerCase().includes(search.toLowerCase()) ||
          template?.description?.toLowerCase().includes(search.toLowerCase())
      )
    : MOCK_TEMPLATES;

  // Sort templates
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    const aValue = a[sortField as keyof Template];
    const bValue = b[sortField as keyof Template];

    if (aValue == null || bValue == null) {
      return 0;
    }

    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      comparison = Number(aValue) - Number(bValue);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedTemplates = sortedTemplates.slice(start, end);
  return {
    templates: paginatedTemplates,
    page,
    perPage,
    total: filteredTemplates.length,
  };
};

export const getTemplate = async ({
  templateId,
  signal,
}: {
  templateId: string;
  signal?: AbortSignal;
}): Promise<ParsedTemplate> => {
  const response = await KibanaServices.get().http.fetch<ParsedTemplate>(
    INTERNAL_TEMPLATE_DETAILS_URL.replace('{template_id}', templateId),
    {
      method: 'GET',
      signal,
    }
  );
  return response;
};

export const patchTemplate = async ({
  templateId,
  template,
}: {
  templateId: string;
  template: TemplateUpdateRequest;
  signal?: AbortSignal;
}): Promise<Template> => {
  const response = await KibanaServices.get().http.fetch<Template>(
    INTERNAL_TEMPLATE_DETAILS_URL.replace('{template_id}', templateId),
    {
      method: 'PATCH',
      body: JSON.stringify(template),
    }
  );
  return response;
};

export const bulkDeleteTemplates = async ({
  templateIds,
  signal,
}: {
  templateIds: string[];
  signal?: AbortSignal;
}): Promise<BulkDeleteTemplatesResponse> => {
  await KibanaServices.get().http.fetch<void>(INTERNAL_BULK_DELETE_TEMPLATES_URL, {
    method: 'POST',
    body: JSON.stringify({ ids: templateIds }),
    signal,
  });

  return {
    success: true,
    deleted: templateIds,
    errors: [],
  };
};

export const bulkExportTemplates = async ({
  templateIds,
  signal,
}: {
  templateIds: string[];
  signal?: AbortSignal;
}): Promise<BulkExportTemplatesResponse> => {
  const templates = await KibanaServices.get().http.fetch<ParsedTemplate[]>(
    INTERNAL_BULK_EXPORT_TEMPLATES_URL,
    {
      method: 'POST',
      body: JSON.stringify({ ids: templateIds }),
      signal,
    }
  );
  const yamlContent = templatesToYaml(templates);
  const filename = `templates-bulk-export-${Date.now()}.yaml`;

  const blob = new Blob([yamlContent], { type: 'application/x-yaml' });
  const url = typeof URL?.createObjectURL === 'function' ? URL.createObjectURL(blob) : '';
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (url && typeof URL?.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }

  return {
    filename,
    content: yamlContent,
  };
};

export const getTemplateTags = async ({
  signal,
}: {
  signal?: AbortSignal;
} = {}): Promise<string[]> => {
  const response = await KibanaServices.get().http.fetch<string[]>(INTERNAL_TEMPLATE_TAGS_URL, {
    method: 'GET',
    signal,
  });

  return response ?? [];
};

export const getTemplateCreators = async ({
  signal,
}: {
  signal?: AbortSignal;
} = {}): Promise<string[]> => {
  const response = await KibanaServices.get().http.fetch<string[]>(INTERNAL_TEMPLATE_CREATORS_URL, {
    method: 'GET',
    signal,
  });

  return response ?? [];
};
