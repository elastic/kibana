/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// Abstraction defining a federated data source ("fetcher")
// This needs to define connectivity (oauth) configuration,
// what tools should be created, what workflows should be created
// TODO: handle FE config as well
export interface DataTypeDefinition {
  // metadata
  id: string;
  name: string;
  description?: string;

  // "taking action" / "execution" part of a data source - i.e. how to interact with data stored in 3rd party
  // the only model for "taking action"/"executing" sth against the 3rd party is via workflows
  workflowTemplates: {
    content: string;
    generateTool: boolean;
  }[];
  // the only model for executing sth from a workflow against the 3rd party is via stack connectors
  stackConnector: {
    type: string;
    config: {};
  };

  // auth
  oauthConfiguration?: {
    provider: string;
    scopes?: string[];
    initiatePath: string;
    fetchSecretsPath: string;
    oauthBaseUrl: string;
  };
}
