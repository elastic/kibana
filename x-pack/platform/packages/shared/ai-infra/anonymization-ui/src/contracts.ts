/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, IToasts } from '@kbn/core/public';
import type { TargetType } from './common/target_types';

export interface TrustedNerModelOption {
  id: string;
  label: string;
}

export type PreviewTargetType = TargetType;

export interface PreviewDocumentTarget {
  targetType: PreviewTargetType;
  targetId: string;
}

export type FetchPreviewDocument = (
  target: PreviewDocumentTarget
) => Promise<Record<string, unknown> | undefined>;

export interface AnonymizationUiServices {
  http: {
    fetch: HttpSetup['fetch'];
  };
  notifications: {
    addError: IToasts['addError'];
    addSuccess: IToasts['addSuccess'];
    addWarning: IToasts['addWarning'];
  };
}
