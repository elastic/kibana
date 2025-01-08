/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const noToolUsageDirective = `
Please answer with text. You should NOT call or use a tool, even if tools might be available and even if
the user explicitly asks for it. DO NOT UNDER ANY CIRCUMSTANCES call a tool. Instead, ALWAYS reply with text.
`;

export const addNoToolUsageDirective = (systemMessage: string | undefined): string => {
  return systemMessage ? `${systemMessage}\n\n${noToolUsageDirective}` : noToolUsageDirective;
};
