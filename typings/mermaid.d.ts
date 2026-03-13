/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-default-export */

declare module 'mermaid' {
  interface MermaidAPI {
    initialize: (config: Record<string, unknown>) => void;
    render: (id: string, text: string) => Promise<{ svg: string }>;
    parse: (text: string) => Promise<unknown>;
  }

  const mermaid: MermaidAPI;
  export default mermaid;
}
