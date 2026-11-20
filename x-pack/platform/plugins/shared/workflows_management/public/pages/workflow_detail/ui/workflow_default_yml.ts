/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Seed YAML for `/create` — empty structure for the visual builder canvas. */
export const workflowDefaultYaml = `version: "1"
name: New workflow
enabled: false
description: This is a new workflow
triggers: []
steps: []
`;

/** Hello-world sample that seeds `/create` when the visual editor is off. */
export const workflowYamlEditorSeedYaml = `version: "1"
name: New workflow
enabled: false
description: This is a new workflow
triggers:
  - type: manual
    inputs:
      - name: message
        type: string
        default: "hello world"

steps:
  - name: hello_world_step
    type: console
    with:
      message: "{{ inputs.message }}"
`;
