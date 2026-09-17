/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type {
  HttpStart,
  NotificationsStart,
  ApplicationStart,
  IUiSettingsClient,
} from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { QuerySandbox, RuleFormProvider } from '@kbn/alerting-v2-rule-form';
import { getRootEsqlQuery } from '@kbn/alerting-v2-schemas';
import { FlyoutAccordion } from '@kbn/flyout-sections';
import { i18n } from '@kbn/i18n';
import { useRuleSummary } from './rule_summary_context';

export const RuleSummaryQueryPreviewSection: React.FC = () => {
  const rule = useRuleSummary();
  const query = rule.query ? getRootEsqlQuery(rule.query) : '';
  const timeField = rule.time_field ?? '@timestamp';

  const http = useService<HttpStart>(CoreStart('http'));
  const notifications = useService<NotificationsStart>(CoreStart('notifications'));
  const application = useService<ApplicationStart>(CoreStart('application'));
  const uiSettings = useService<IUiSettingsClient>(CoreStart('uiSettings'));
  const featureFlags = useService(CoreStart('featureFlags'));
  const data = useService<DataPublicPluginStart>(PluginStart('data'));
  const dataViews = useService<DataViewsPublicPluginStart>(PluginStart('dataViews'));
  const lens = useService<LensPublicStart>(PluginStart('lens'));

  const services = useMemo(
    () => ({ http, notifications, application, uiSettings, featureFlags, data, dataViews, lens }),
    [http, notifications, application, uiSettings, featureFlags, data, dataViews, lens]
  );

  const [dateStart, setDateStart] = useState('now-15m');
  const [dateEnd, setDateEnd] = useState('now');

  const handleDateRangeChange = useCallback((range: { dateStart: string; dateEnd: string }) => {
    setDateStart(range.dateStart);
    setDateEnd(range.dateEnd);
  }, []);

  return (
    <FlyoutAccordion
      title={i18n.translate('xpack.alertingV2.ruleSummary.queryPreview', {
        defaultMessage: 'Query preview',
      })}
      hasBorder={false}
      data-test-subj="ruleSummaryQueryPreview"
    >
      <RuleFormProvider services={services}>
        <QuerySandbox
          query={query}
          timeField={timeField}
          dateRange={{ dateStart, dateEnd }}
          onDateRangeChange={handleDateRangeChange}
          autoRun
        />
      </RuleFormProvider>
    </FlyoutAccordion>
  );
};
