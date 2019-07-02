/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const parseError = async (response: Response): Promise<string | null> => {
  if (!response.ok) {
    const body = await parseJsonFromBody(response);
    if (body != null && body.message) {
      return body.message;
    } else {
      return `Network Error: ${response.statusText}`;
    }
  } else {
    return null;
  }
};

interface MessageBody {
  error?: string;
  message?: string;
  statusCode?: number;
}
export const parseJsonFromBody = async (response: Response): Promise<MessageBody | null> => {
  try {
    const text = await response.text();
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
};
