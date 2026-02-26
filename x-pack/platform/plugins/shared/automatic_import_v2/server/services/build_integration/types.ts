/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface IntegrationManifest {
  format_version: string;
  name: string;
  title: string;
  version: string;
  description: string;
  type: string;
  categories: string[];
  conditions: {
    kibana: {
      version: string;
    };
  };
  icons?: Array<{
    src: string;
    title: string;
    size: string;
    type: string;
  }>;
  policy_templates: Array<{
    name: string;
    title: string;
    description: string;
    inputs: Array<{
      type: string;
      title: string;
      description: string;
    }>;
  }>;
  owner: {
    github: string;
    type: string;
  };
}
