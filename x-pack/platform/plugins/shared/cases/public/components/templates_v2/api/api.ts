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
import { templatesToYaml } from '../utils/templates_to_yaml';
import type {
  TemplatesFindRequest,
  TemplatesFindResponse,
} from '../../../../common/types/api/template/v1';
import type {
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
  signal,
  queryParams,
}: {
  signal?: AbortSignal;
  queryParams: TemplatesFindRequest;
}): Promise<TemplatesFindResponse> => {
  const { page, perPage, search, sortField, sortOrder, tags, author, isDeleted } = queryParams;

  const response = await KibanaServices.get().http.fetch<TemplatesFindResponse>(
    INTERNAL_TEMPLATES_URL,
    {
      method: 'GET',
      query: {
        page,
        perPage,
        search,
        sortField,
        sortOrder,
        isDeleted,
        ...(tags && tags.length > 0 ? { tags } : {}),
        ...(author && author.length > 0 ? { author } : {}),
      },
      signal,
    }
  );

  return response;
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
