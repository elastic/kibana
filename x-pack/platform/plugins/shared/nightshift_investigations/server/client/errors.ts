/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class InvestigationNotFoundError extends Error {
  constructor(investigationId: string) {
    super(`Investigation "${investigationId}" not found`);
    this.name = 'InvestigationNotFoundError';
  }
}

/**
 * Thrown when an alert investigation is started without the alert data it exists to reason about.
 * The route schema catches this for HTTP callers, but the workflow step definition and the plugin
 * start contract reach the client directly, and without the snapshots the agent gets an opaque
 * uuid and nothing else.
 */
export class MissingAlertContextError extends Error {
  constructor() {
    super(
      'An alert investigation requires context.alerts to hold at least one alert snapshot with id, rule_name and reason'
    );
    this.name = 'MissingAlertContextError';
  }
}
