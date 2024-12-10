/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import datemath from '@kbn/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiSpacer } from '@elastic/eui';
import { IExecutionKPIResult } from '@kbn/actions-plugin/common';
import {
  ComponentOpts as ConnectorApis,
  withActionOperations,
} from '../../common/components/with_actions_api_operations';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { EventLogListStatus, EventLogStat } from '../../common/components/event_log';

const getParsedDate = (date: string) => {
  if (date.includes('now')) {
    return datemath.parse(date)?.format() || date;
  }
  return date;
};

const API_FAILED_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.sections.connectorEventLogListKpi.apiError',
  {
    defaultMessage: 'Failed to fetch event log KPI.',
  }
);

const RESPONSE_TOOLTIP = i18n.translate(
  'xpack.triggersActionsUI.sections.connectorEventLogListKpi.responseTooltip',
  {
    defaultMessage: 'The responses for up to 10,000 most recent actions triggered.',
  }
);

export type ConnectorEventLogListKPIProps = {
  dateStart: string;
  dateEnd: string;
  outcomeFilter?: string[];
  message?: string;
  refreshToken?: number;
  namespaces?: Array<string | undefined>;
} & Pick<ConnectorApis, 'loadGlobalConnectorExecutionKPIAggregations'>;

export const ConnectorEventLogListKPI = (props: ConnectorEventLogListKPIProps) => {
  const {
    dateStart,
    dateEnd,
    outcomeFilter,
    message,
    refreshToken,
    namespaces,
    loadGlobalConnectorExecutionKPIAggregations,
  } = props;
  const {
    notifications: { toasts },
  } = useKibana().services;

  const isInitialized = useRef(false);
  const isUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [kpi, setKpi] = useState<IExecutionKPIResult>();

  const loadKPIFn = useMemo(() => {
    return loadGlobalConnectorExecutionKPIAggregations;
  }, [loadGlobalConnectorExecutionKPIAggregations]);

  const loadKPIs = async () => {
    setIsLoading(true);
    try {
      const newKpi = await loadKPIFn({
        dateStart: getParsedDate(dateStart),
        dateEnd: getParsedDate(dateEnd),
        outcomeFilter,
        message,
        ...(namespaces ? { namespaces } : {}),
      });
      setKpi(newKpi);
    } catch (e) {
      toasts.addDanger({
        title: API_FAILED_MESSAGE,
        text: e.body?.message ?? e,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadKPIs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStart, dateEnd, outcomeFilter, message, namespaces]);

  useEffect(() => {
    if (isInitialized.current) {
      loadKPIs();
    }
    isInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const isLoadingData = useMemo(() => isLoading || !kpi, [isLoading, kpi]);

  const getStatDescription = (element: React.ReactNode) => {
    return (
      <>
        {element}
        <EuiSpacer size="s" />
      </>
    );
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={4}>
        <EventLogStat title="Responses" tooltip={RESPONSE_TOOLTIP}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="connectorEventLogKpi-successOutcome"
                description={getStatDescription(
                  <EventLogListStatus
                    status="success"
                    useExecutionStatus={isUsingExecutionStatus}
                  />
                )}
                titleSize="s"
                title={kpi?.success ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="connectorEventLogKpi-warningOutcome"
                description={getStatDescription(
                  <EventLogListStatus
                    status="warning"
                    useExecutionStatus={isUsingExecutionStatus}
                  />
                )}
                titleSize="s"
                title={kpi?.warning ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="connectorEventLogKpi-failureOutcome"
                description={getStatDescription(
                  <EventLogListStatus
                    status="failure"
                    useExecutionStatus={isUsingExecutionStatus}
                  />
                )}
                titleSize="s"
                title={kpi?.failure ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="connectorEventLogKpi-unknownOutcome"
                description={getStatDescription(
                  <EventLogListStatus
                    status="unknown"
                    useExecutionStatus={isUsingExecutionStatus}
                  />
                )}
                titleSize="s"
                title={kpi?.unknown ?? 0}
                isLoading={isLoadingData}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EventLogStat>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ConnectorEventLogListKPIWithApi = withActionOperations(ConnectorEventLogListKPI);
