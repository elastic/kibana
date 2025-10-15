/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type {
  Evaluator,
  ListEvaluatorsResponse,
  EvaluatorConfig,
  EvaluationRunResponse,
} from '../../../common/http_api/evaluations';
import { publicApiPath } from '../../../common/constants';

export class EvaluationsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list(): Promise<Evaluator[]> {
    const response = await this.http.get<ListEvaluatorsResponse>(`${publicApiPath}/evaluators`);
    return response.evaluators;
  }

  async run(conversationId: string, evaluators: EvaluatorConfig[]): Promise<EvaluationRunResponse> {
    return await this.http.post<EvaluationRunResponse>(`${publicApiPath}/evaluations`, {
      body: JSON.stringify({
        conversationId,
        evaluators,
      }),
    });
  }
}
