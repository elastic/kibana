/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A minimal, valid workflow definition used to seed a new automation.
 */
export const buildStarterWorkflowYaml = (aiIndexName: string): string => {
  // JSON.stringify yields a double-quoted, escaped string that is also a valid
  // YAML scalar, so a name with colons/quotes/etc. can't break the document.
  const name = JSON.stringify(`${aiIndexName} automation`);
  const description = JSON.stringify(`Automation for the ${aiIndexName} AI index`);

  return `name: ${name}
enabled: false
description: ${description}
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
};
