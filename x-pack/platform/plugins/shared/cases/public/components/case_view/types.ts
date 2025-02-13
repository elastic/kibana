/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ComponentType, MutableRefObject } from 'react';
import type { AlertsTableProps } from '@kbn/response-ops-alerts-table/types';
import type { CasesTimelineIntegration } from '../timeline_context';
import type { CasesNavigation } from '../links';
import type { CaseViewRefreshPropInterface, CaseUI } from '../../../common';
import type { UseFetchAlertData } from '../../../common/ui';

export interface CaseViewBaseProps {
  onComponentInitialized?: () => void;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
  ruleDetailsNavigation?: CasesNavigation<string | null | undefined, 'configurable'>;
  showAlertDetails?: (alertId: string, index: string) => void;
  useFetchAlertData: UseFetchAlertData;
  renderAlertsTable?: ComponentType<CaseViewAlertsTableProps>;
  onAlertsTableLoaded?: (eventIds: Array<Partial<{ _id: string }>>) => void;
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
  key: keyof CaseUI;
  value: CaseUI[keyof CaseUI];
  onSuccess?: () => void;
  onError?: () => void;
}

export type CaseViewAlertsTableProps = Pick<
  AlertsTableProps,
  'id' | 'ruleTypeIds' | 'consumers' | 'query' | 'showAlertStatusWithFlapping' | 'onLoaded'
> & {
  services?: AlertsTableProps['services'];
};
