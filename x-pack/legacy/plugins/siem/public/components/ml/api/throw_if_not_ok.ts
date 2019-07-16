/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface MessageBody {
  error?: string;
  message?: string;
  statusCode?: number;
}

export const throwIfNotOk = async (response: Response): Promise<void> => {
  if (!response.ok) {
    const body = await parseJsonFromBody(response);
    if (body != null && body.message) {
      throw new Error(body.message);
    } else {
      throw new Error(`Network Error: ${response.statusText}`);
    }
  }
};

export const parseJsonFromBody = async (response: Response): Promise<MessageBody | null> => {
  try {
    const text = await response.text();
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
};
