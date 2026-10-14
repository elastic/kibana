/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MutableRefObject } from 'react';
import type { CasesTimelineIntegration } from '../timeline_context';
import type { CaseViewRefreshPropInterface, CaseUI } from '../../../common';

export interface CaseViewBaseProps {
  onComponentInitialized?: () => void;
  /**
   * A React `Ref` that Exposes data refresh callbacks.
   * **NOTE**: Do not hold on to the `.current` object, as it could become stale
   */
  refreshRef?: MutableRefObject<CaseViewRefreshPropInterface>;
}

export interface CaseViewProps extends CaseViewBaseProps {
  timelineIntegration?: CasesTimelineIntegration;
}

export interface CaseViewPageProps extends CaseViewBaseProps {
  fetchCase: () => void;
  caseData: CaseUI;
}

export interface OnUpdateFields {
  key: keyof CaseUI | string;
  value: CaseUI[keyof CaseUI] | unknown;
  onSuccess?: () => void;
  onError?: () => void;
}
