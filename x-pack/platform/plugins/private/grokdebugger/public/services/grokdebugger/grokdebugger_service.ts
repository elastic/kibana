/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

import { ROUTES } from '../../../common/constants';
import { GrokdebuggerResponse } from '../../models/grokdebugger_response';
import type { GrokdebuggerRequest } from '../../models/grokdebugger_request';
import type { GrokdebuggerResponseParams } from '../../models/types';

interface HttpError {
  body: {
    message: string;
  };
}

function isHttpError(error: unknown): error is HttpError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'body' in error &&
    typeof (error as HttpError).body?.message === 'string'
  );
}

export class GrokdebuggerService {
  constructor(private http: HttpStart) {}

  async simulate(grokdebuggerRequest: GrokdebuggerRequest): Promise<GrokdebuggerResponse> {
    try {
      const response = await this.http.post<GrokdebuggerResponseParams>(
        `${ROUTES.API_ROOT}/simulate`,
        {
          body: JSON.stringify(grokdebuggerRequest.upstreamJSON),
        }
      );
      return GrokdebuggerResponse.fromUpstreamJSON(response);
    } catch (e: unknown) {
      if (isHttpError(e)) {
        throw new Error(e.body.message);
      }
      throw new Error(String(e));
    }
  }
}
