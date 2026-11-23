/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONTEXT_ENGINE_DOCS_NOTE =
  '**For more information, refer to the [Context Engine documentation](https://www.elastic.co/docs/explore-analyze/ai-features/context-engine).**';

export const SOURCE_AUTOMATIONS_NOTE =
  'Each ES|QL source added also gets an index metadata automation, installed as a separate workflow and attached to the AI Index as the calling user, who needs the workflow create and update privileges for it; removing the source deletes the workflow, which needs the delete privilege. The save succeeds whether or not that works. When an automation could not be installed or removed, the response lists it under `warnings`.';
