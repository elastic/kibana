/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentType } from '../../../common/types/domain';
import type { AttachmentRequest } from '../../../common/types/api';
import type { Limiter } from './types';

interface LimiterParams {
  limit: number;
  attachmentType: AttachmentType | AttachmentType[];
  field?: string;
  attachmentNoun: string;
}

export abstract class BaseLimiter implements Limiter {
  public readonly limit: number;
  public readonly errorMessage: string;

  constructor(params: LimiterParams) {
    this.limit = params.limit;
    this.errorMessage = makeErrorMessage(this.limit, params.attachmentNoun);
  }

  public abstract countOfItemsWithinCase(caseId: string): Promise<number>;
  public abstract countOfItemsInRequest(requests: AttachmentRequest[]): number;
}

const makeErrorMessage = (limit: number, noun: string) => {
  return `Case has reached the maximum allowed number (${limit}) of attached ${noun}.`;
};
