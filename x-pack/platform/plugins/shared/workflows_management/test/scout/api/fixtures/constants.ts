/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'true',
};

export const SIMPLE_WORKFLOW_YAML = `name: ImportTest Workflow
description: A simple test workflow for import
enabled: false
triggers:
  - type: manual
steps:
  - type: console
    name: Step 1
    with:
      message: hello
`;
