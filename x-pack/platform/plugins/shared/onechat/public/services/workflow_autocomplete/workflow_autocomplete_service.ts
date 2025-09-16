/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

export interface WorkflowSuggestion {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  inputs?: Array<{
    name: string;
    type: string;
    description?: string;
    required: boolean;
    example?: string;
  }>;
}

export interface WorkflowAutocompleteResponse {
  workflows: WorkflowSuggestion[];
  hasWorkflowSupport: boolean;
}

export class WorkflowAutocompleteService {
  constructor(private http: HttpSetup) {}

  async getWorkflowSuggestions(query?: string, limit?: number): Promise<WorkflowAutocompleteResponse> {
    const params = new URLSearchParams();
    if (query) {
      params.set('query', query);
    }
    if (limit) {
      params.set('limit', limit.toString());
    }

    const response = await this.http.get<WorkflowAutocompleteResponse>(
      '/api/onechat/workflows/autocomplete',
      {
        query: Object.fromEntries(params),
      }
    );

    return response;
  }
}
