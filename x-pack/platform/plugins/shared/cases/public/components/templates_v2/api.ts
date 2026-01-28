/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_TEMPLATES } from './sample_data';
import type {
  Template,
  TemplatesFindResponse,
  TemplateRequest,
  TemplateUpdateRequest,
  DeleteTemplateResponse,
  ExportTemplateResponse,
} from './types';

// TODO: Uncomment when API is available
// import { KibanaServices } from '../../common/lib/kibana';
// import { CASES_URL } from '../../../common/constants';
// const TEMPLATES_URL = `${CASES_URL}/templates` as const;

export const getTemplates = async ({
  page = 1,
  perPage = 10,
}: {
  signal?: AbortSignal;
  page?: number;
  perPage?: number;
}): Promise<TemplatesFindResponse> => {
  // TODO: Replace with actual API call when available
  // const response = await KibanaServices.get().http.fetch<TemplatesFindResponse>(TEMPLATES_URL, {
  //   method: 'GET',
  //   query: { page, perPage },
  //   signal,
  // });
  // return response;

  // Return mock data
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedTemplates = MOCK_TEMPLATES.slice(start, end);

  return {
    templates: paginatedTemplates,
    page,
    perPage,
    total: MOCK_TEMPLATES.length,
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
    key: `template-${Date.now()}`,
    lastUpdate: new Date().toISOString(),
    lastTimeUsed: new Date().toISOString(),
    usage: 0,
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
  const existingTemplate = MOCK_TEMPLATES.find((t) => t.key === templateId);

  if (!existingTemplate) {
    throw new Error(`Template with id ${templateId} not found`);
  }

  const updatedTemplate: Template = {
    ...existingTemplate,
    ...template,
    lastUpdate: new Date().toISOString(),
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
  const existingTemplate = MOCK_TEMPLATES.find((t) => t.key === templateId);

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
  const existingTemplate = MOCK_TEMPLATES.find((t) => t.key === templateId);

  if (!existingTemplate) {
    throw new Error(`Template with id ${templateId} not found`);
  }

  // Mock: Convert template to YAML (server will handle this in real implementation)
  const yamlLines: string[] = [
    `# Template: ${existingTemplate.name}`,
    `# Exported: ${new Date().toISOString()}`,
    '',
    `key: ${existingTemplate.key}`,
    `name: ${existingTemplate.name}`,
    `description: ${existingTemplate.description}`,
    `solution: ${existingTemplate.solution}`,
    `fields: ${existingTemplate.fields}`,
    `tags:`,
    ...existingTemplate.tags.map((tag) => `  - ${tag}`),
    `lastUpdate: ${existingTemplate.lastUpdate}`,
    `lastTimeUsed: ${existingTemplate.lastTimeUsed}`,
    `usage: ${existingTemplate.usage}`,
    `isDefault: ${existingTemplate.isDefault}`,
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
