/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class InvestigationSubjectMissingError extends Error {
  constructor(investigationId: string) {
    super(
      `Workflow execution "${investigationId}" has no investigation subject ` +
        '(expected inputs.context.source and a matching inputs.context.<source>_id). ' +
        'Investigations require a subject; pass one when triggering the workflow.'
    );
    this.name = 'InvestigationSubjectMissingError';
  }
}
