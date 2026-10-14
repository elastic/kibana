/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import type { PreservedTimeUnit } from '../../shared';

export interface DlmPhaseAfterFields {
  afterValue: string;
  afterUnit: PreservedTimeUnit;
}

export interface DlmPhaseFields extends DlmPhaseAfterFields {
  enabled: boolean;
}

export interface DlmPhasesFlyoutFormInternal {
  frozen: DlmPhaseFields;
  delete: DlmPhaseFields;
}

export type DlmPhasesFlyoutFormOutput = IngestStreamLifecycleDSL['dsl'];
