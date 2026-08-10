/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The content-only fields of a custom content panel, without presentation-layer title metadata. */
export interface CustomContentState {
  prompt?: string;
  esqlQuery?: string;
  template?: string;
}
