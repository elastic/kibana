/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare const agentIdRegexp: RegExp;
export declare const agentIdMaxLength = 64;
export declare const validateAgentId: ({
  agentId,
  builtIn,
}: {
  agentId: string;
  builtIn: boolean;
}) => string | undefined;
