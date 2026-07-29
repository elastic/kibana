/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RenderIacTemplateRequest {
  provider: 'aws';
  packageName: string;
  policyTemplate: string;
}

export interface RenderIacTemplateResponse {
  /**
   * Pre-signed URL of the rendered template. Embeds signing credentials —
   * never log or cache; fetch just-in-time.
   */
  artifactUrl: string;
  /** ISO 8601 UTC timestamp when the pre-signed URL expires. */
  expiresAt: string;
}
