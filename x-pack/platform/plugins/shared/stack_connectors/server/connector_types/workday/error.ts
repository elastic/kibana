/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const parseStatusMessage = (message: string): { code: number; message: string } => {
  const regex = /Status code: (\d+). Message: (.+)/;
  const match = message.match(regex);
  if (match) {
    return {
      code: parseInt(match[1], 10),
      message: match[2],
    };
  }
  return {
    code: 500,
    message,
  };
};

export class WorkdayError extends Error {
  public code: number;
  constructor(message: string) {
    super(message);
    const parsed = parseStatusMessage(message);
    this.code = parsed.code;
    this.message = parsed.message || 'Unknown Workday error';
  }
}
