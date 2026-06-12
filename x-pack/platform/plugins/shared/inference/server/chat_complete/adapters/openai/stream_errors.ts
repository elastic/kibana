/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertUpstreamError } from '../../utils';

/**
 * Error line from standard openAI providers
 */
export interface OpenAIErrorLine {
  error: { message: string };
}

/**
 * Error line from the Elastic inference API.
 */
export interface ElasticInferenceErrorLine {
  error: {
    type: string;
    reason: string;
    root_cause?: { type: string; reason: string };
  };
  status?: number;
}

/**
 * Error line not respecting either of those two formats.
 */
export interface UnknownErrorLine {
  error: Record<string, any>;
}

export type ErrorLine = OpenAIErrorLine | ElasticInferenceErrorLine | UnknownErrorLine;

export const convertStreamError = ({ error }: ErrorLine) => {
  if ('message' in error) {
    return convertUpstreamError(error.message);
  } else if ('reason' in error) {
    return convertUpstreamError(`${error.type} - ${error.reason}`);
  } else {
    return convertUpstreamError(JSON.stringify(error));
  }
};
