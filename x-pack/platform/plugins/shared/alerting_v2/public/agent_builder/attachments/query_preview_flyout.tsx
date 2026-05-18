/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { HttpStart, NotificationsStart, ApplicationStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { DiscoverSandboxPanel, RuleFormProvider } from '@kbn/alerting-v2-rule-form';

const QUERY_PREVIEW_FLYOUT_TITLE_ID = 'queryPreviewFlyoutTitle';

export interface QueryPreviewFlyoutProps {
  query: string;
  timeField: string;
  onClose: () => void;
}

const QueryPreviewFlyoutInner: React.FC<QueryPreviewFlyoutProps> = ({
  query,
  timeField,
  onClose,
}) => {
  const http = useService<HttpStart>(CoreStart('http'));
  const notifications = useService<NotificationsStart>(CoreStart('notifications'));
  const application = useService<ApplicationStart>(CoreStart('application'));
  const data = useService<DataPublicPluginStart>(PluginStart('data'));
  const dataViews = useService<DataViewsPublicPluginStart>(PluginStart('dataViews'));
  const lens = useService<LensPublicStart>(PluginStart('lens'));

  const services = useMemo(
    () => ({ http, notifications, application, data, dataViews, lens }),
    [http, notifications, application, data, dataViews, lens]
  );

  const [dateStart, setDateStart] = useState('now-15m');
  const [dateEnd, setDateEnd] = useState('now');

  const handleDateRangeChange = useCallback((start: string, end: string) => {
    setDateStart(start);
    setDateEnd(end);
  }, []);

  return (
    <RuleFormProvider services={services} meta={{ layout: 'flyout' }}>
      <EuiFlyout type="overlay" size="fill" onClose={onClose} aria-labelledby={QUERY_PREVIEW_FLYOUT_TITLE_ID}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s" id={QUERY_PREVIEW_FLYOUT_TITLE_ID}>
            <h3>
              {i18n.translate('xpack.alertingV2.queryPreview.title', {
                defaultMessage: 'Query preview',
              })}
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <DiscoverSandboxPanel
            query={query}
            timeField={timeField}
            dateStart={dateStart}
            dateEnd={dateEnd}
            onDateRangeChange={handleDateRangeChange}
            readOnly
            services={{ http, data, dataViews }}
          />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} data-test-subj="queryPreviewClose">
                {i18n.translate('xpack.alertingV2.queryPreview.closeButton', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </RuleFormProvider>
  );
};

/**
 * Read-only flyout that displays an ES|QL query with execution results,
 * chart, and data grid. Must be rendered inside a DI Context.Provider.
 * Used by the rule attachment canvas to preview agent-created queries
 * without editing capabilities.
 */
export const QueryPreviewFlyout: React.FC<QueryPreviewFlyoutProps> = (props) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <QueryPreviewFlyoutInner {...props} />
    </QueryClientProvider>
  );
};
