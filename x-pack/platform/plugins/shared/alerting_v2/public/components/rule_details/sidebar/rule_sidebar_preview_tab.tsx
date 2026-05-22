/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { HttpStart, NotificationsStart, ApplicationStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { QuerySandbox, RuleFormProvider } from '@kbn/alerting-v2-rule-form';
import { useRule } from '../rule_context';

const queryClient = new QueryClient();

const RuleSidebarPreviewTabInner: React.FC = () => {
  const rule = useRule();
  // The persisted rule only stores `evaluation.query.base`; split alert/recovery
  // blocks are a compose-time concern and aren't saved on the rule object.
  const query = rule.evaluation?.query?.base ?? '';
  const timeField = rule.time_field ?? '@timestamp';

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

  const handleDateRangeChange = useCallback((range: { dateStart: string; dateEnd: string }) => {
    setDateStart(range.dateStart);
    setDateEnd(range.dateEnd);
  }, []);

  return (
    <RuleFormProvider services={services}>
      <QuerySandbox
        query={query}
        timeField={timeField}
        dateRange={{ dateStart, dateEnd }}
        onDateRangeChange={handleDateRangeChange}
        autoRun
      />
    </RuleFormProvider>
  );
};

export const RuleSidebarPreviewTab: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <RuleSidebarPreviewTabInner />
  </QueryClientProvider>
);
