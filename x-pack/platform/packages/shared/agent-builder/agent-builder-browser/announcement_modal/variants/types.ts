/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Props for variant body + footer (modal chrome lives in the parent). */
export interface AnnouncementModalVariantProps {
  onContinue: () => void;
  onRevert: () => void;
}
