/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Template } from '../../../../common/types/domain/template/v1';
import { MOCK_TEMPLATES } from './sample_data';
import type {
  TemplatesFindResponse,
  TemplateRequest,
  TemplateUpdateRequest,
  DeleteTemplateResponse,
  BulkDeleteTemplatesResponse,
  ExportTemplateResponse,
  BulkExportTemplatesResponse,
} from '../types';

// TODO: Uncomment when API is available
// import { KibanaServices } from '../../common/lib/kibana';
// import { CASES_URL } from '../../../common/constants';
// const TEMPLATES_URL = `${CASES_URL}/templates` as const;

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

export const postTemplate = async ({
  template,
}: {
  template: TemplateRequest;
  signal?: AbortSignal;
}): Promise<Template> => {
  // TODO: Replace with actual API call when available
  // const response = await KibanaServices.get().http.fetch<Template>(TEMPLATES_URL, {
  //   method: 'POST',
  //   body: JSON.stringify(template),
  //   signal,
  // });
  // return response;

  // Return mock data
  const newTemplate: Template = {
    ...template,
    templateId: `template-${Date.now()}`,
    templateVersion: 1,
    deletedAt: null,
    usageCount: 0,
    lastUsedAt: new Date().toISOString(),
  };

  return newTemplate;
};

export const patchTemplate = async ({
  templateId,
  template,
}: {
  templateId: string;
  template: TemplateUpdateRequest;
  signal?: AbortSignal;
}): Promise<Template> => {
  // TODO: Replace with actual API call when available
  // const response = await KibanaServices.get().http.fetch<Template>(`${TEMPLATES_URL}/${templateId}`, {
  //   method: 'PATCH',
  //   body: JSON.stringify(template),
  //   signal,
  // });
  // return response;

  // Return mock data
  const existingTemplate = MOCK_TEMPLATES.find((t) => t.templateId === templateId);

  if (!existingTemplate) {
    throw new Error(`Template with id ${templateId} not found`);
  }

  const updatedTemplate: Template = {
    ...existingTemplate,
    ...template,
    templateVersion: existingTemplate.templateVersion + 1,
  };

  return updatedTemplate;
};

export const deleteTemplate = async ({
  templateId,
}: {
  templateId: string;
  signal?: AbortSignal;
}): Promise<DeleteTemplateResponse> => {
  // TODO: Replace with actual API call when available
  // const response = await KibanaServices.get().http.fetch<DeleteTemplateResponse>(
  //   `${TEMPLATES_URL}/${templateId}`,
  //   {
  //     method: 'DELETE',
  //     signal,
  //   }
  // );
  // return response;

  // Return mock data
  const existingTemplate = MOCK_TEMPLATES.find((t) => t.templateId === templateId);

  if (!existingTemplate) {
    throw new Error(`Template with id ${templateId} not found`);
  }

  return { success: true };
};

export const exportTemplate = async ({
  templateId,
}: {
  templateId: string;
  signal?: AbortSignal;
}): Promise<ExportTemplateResponse> => {
  // TODO: Replace with actual API call when available.
  // The server will generate the YAML file and return it as a blob.
  // The client will then trigger a download from the server response.
  //
  // const response = await KibanaServices.get().http.fetch<Blob>(
  //   `${TEMPLATES_URL}/${templateId}/export`,
  //   {
  //     method: 'GET',
  //     signal,
  //   }
  // );
  //
  // const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 'template.yaml';
  // const url = URL.createObjectURL(response);
  // const link = document.createElement('a');
  // link.href = url;
  // link.download = filename;
  // document.body.appendChild(link);
  // link.click();
  // document.body.removeChild(link);
  // URL.revokeObjectURL(url);
  //
  // return { filename, content: '' };

  // ---- MOCK IMPLEMENTATION - Remove when API is available ----
  const existingTemplate = MOCK_TEMPLATES.find((t) => t.templateId === templateId);

  if (!existingTemplate) {
    throw new Error(`Template with id ${templateId} not found`);
  }

  // Mock: Convert template to YAML (server will handle this in real implementation)
  const yamlLines: string[] = [
    `# Template: ${existingTemplate.name}`,
    `# Exported: ${new Date().toISOString()}`,
    '',
    `templateId: ${existingTemplate.templateId}`,
    `name: ${existingTemplate.name}`,
    `description: ${existingTemplate.description ?? ''}`,
    `fieldCount: ${existingTemplate.fieldCount ?? 0}`,
    `tags:`,
    ...(existingTemplate.tags ?? []).map((tag) => `  - ${tag}`),
    `lastUsedAt: ${existingTemplate.lastUsedAt ?? ''}`,
    `usageCount: ${existingTemplate.usageCount ?? 0}`,
    `isDefault: ${existingTemplate.isDefault ?? false}`,
  ];
  const yamlContent = yamlLines.join('\n');
  const filename = `${existingTemplate.name.toLowerCase().replace(/\s+/g, '-')}-template.yaml`;

  // Mock: Trigger download (will be handled differently with real API response)
  const blob = new Blob([yamlContent], { type: 'application/x-yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  // ---- END MOCK IMPLEMENTATION ----

  return {
    filename,
    content: yamlContent,
  };
};

export const bulkDeleteTemplates = async ({
  templateIds,
}: {
  templateIds: string[];
  signal?: AbortSignal;
}): Promise<BulkDeleteTemplatesResponse> => {
  // TODO: Replace with actual API call when available
  // const response = await KibanaServices.get().http.fetch<BulkDeleteTemplatesResponse>(
  //   `${TEMPLATES_URL}/_bulk_delete`,
  //   {
  //     method: 'POST',
  //     body: JSON.stringify({ ids: templateIds }),
  //     signal,
  //   }
  // );
  // return response;

  // ---- MOCK IMPLEMENTATION - Remove when API is available ----
  const deleted: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const templateId of templateIds) {
    const existingTemplate = MOCK_TEMPLATES.find((t) => t.templateId === templateId);

    if (!existingTemplate) {
      errors.push({ id: templateId, error: `Template with id ${templateId} not found` });
    } else {
      deleted.push(templateId);
    }
  }
  // ---- END MOCK IMPLEMENTATION ----

  return {
    success: errors.length === 0,
    deleted,
    errors,
  };
};

export const bulkExportTemplates = async ({
  templateIds,
}: {
  templateIds: string[];
  signal?: AbortSignal;
}): Promise<BulkExportTemplatesResponse> => {
  // TODO: Replace with actual API call when available.
  // The server will generate a single YAML file containing all templates and return it as a blob.
  // The client will then trigger a download from the server response.
  //
  // const response = await KibanaServices.get().http.fetch<Blob>(
  //   `${TEMPLATES_URL}/_bulk_export`,
  //   {
  //     method: 'GET',
  //     query: { ids: templateIds.join(',') },
  //     signal,
  //   }
  // );
  //
  // const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 'templates.yaml';
  // const url = URL.createObjectURL(response);
  // const link = document.createElement('a');
  // link.href = url;
  // link.download = filename;
  // document.body.appendChild(link);
  // link.click();
  // document.body.removeChild(link);
  // URL.revokeObjectURL(url);
  //
  // return { filename, content: '' };

  // ---- MOCK IMPLEMENTATION - Remove when API is available ----
  const templatesToExport = MOCK_TEMPLATES.filter((t) => templateIds.includes(t.templateId));

  if (templatesToExport.length === 0) {
    throw new Error('No templates found for the provided IDs');
  }

  // Mock: Convert templates to YAML (server will handle this in real implementation)
  const yamlSections: string[] = [
    `# Bulk Export: ${templatesToExport.length} templates`,
    `# Exported: ${new Date().toISOString()}`,
    '',
  ];

  for (const template of templatesToExport) {
    yamlSections.push(
      '---',
      `templateId: ${template.templateId}`,
      `name: ${template.name}`,
      `description: ${template.description ?? ''}`,
      `fieldCount: ${template.fieldCount ?? 0}`,
      `tags:`,
      ...(template.tags ?? []).map((tag) => `  - ${tag}`),
      `lastUsedAt: ${template.lastUsedAt ?? ''}`,
      `usageCount: ${template.usageCount ?? 0}`,
      `isDefault: ${template.isDefault ?? false}`,
      ''
    );
  }

  const yamlContent = yamlSections.join('\n');
  const filename = `templates-bulk-export-${Date.now()}.yaml`;

  // Mock: Trigger download (will be handled differently with real API response)
  const blob = new Blob([yamlContent], { type: 'application/x-yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  // ---- END MOCK IMPLEMENTATION ----

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
  // TODO: Replace with actual API call when available
  // const response = await KibanaServices.get().http.fetch<string[]>(
  //   `${TEMPLATES_URL}/tags`,
  //   {
  //     method: 'GET',
  //     signal,
  //   }
  // );
  // return response;

  // ---- MOCK IMPLEMENTATION - Remove when API is available ----
  // Extract unique tags from all templates
  const allTags = MOCK_TEMPLATES.flatMap((template) => template.tags);
  const uniqueTags = [...new Set(allTags)].sort();
  // ---- END MOCK IMPLEMENTATION ----
  return uniqueTags as string[];
};

export const getTemplateCreators = async ({
  signal,
}: {
  signal?: AbortSignal;
} = {}): Promise<string[]> => {
  // TODO: Replace with actual API call when available
  // const response = await KibanaServices.get().http.fetch<string[]>(
  //   `${TEMPLATES_URL}/creators`,
  //   {
  //     method: 'GET',
  //     signal,
  //   }
  // );
  // return response;

  // ---- MOCK IMPLEMENTATION - Remove when API is available ----
  // Extract unique creators from all templates
  const allCreators = MOCK_TEMPLATES.map((template) => template.author).filter(Boolean) as string[];
  const uniqueCreators = [...new Set(allCreators)].sort();
  // ---- END MOCK IMPLEMENTATION ----

  return uniqueCreators;
};
