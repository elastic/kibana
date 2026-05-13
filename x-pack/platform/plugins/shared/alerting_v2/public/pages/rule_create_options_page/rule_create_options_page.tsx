/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { ComposeDiscoverFlyout } from '@kbn/alerting-v2-rule-form';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useCreateRule } from '../../hooks/use_create_rule';
import { RuleCreateOptionsPanel } from '../../components/rule_create_options/rule_create_options_panel';

export const RuleCreateOptionsPage = () => {
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;
  useBreadcrumbs('rule_create_options');

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const historyKey = useMemo(() => Symbol('ruleAuthoring'), []);
  const createRuleMutation = useCreateRule();
  const ruleFormServices = useMemo(
    () => ({ http, data, dataViews, notifications, application, lens }),
    [http, data, dataViews, notifications, application, lens]
  );

  return (
    <div>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.ruleCreateOptions.pageTitle"
            defaultMessage="Rules"
          />
        }
      />
      <EuiSpacer size="m" />
      <RuleCreateOptionsPanel onCreateEsqlRule={() => setFlyoutOpen(true)} />
      {flyoutOpen && (
        <ComposeDiscoverFlyout
          historyKey={historyKey}
          mode="create"
          onClose={() => setFlyoutOpen(false)}
          services={ruleFormServices}
          onCreateRule={(payload) =>
            createRuleMutation.mutate(payload, {
              onSuccess: () => {
                setFlyoutOpen(false);
              },
            })
          }
          isSaving={createRuleMutation.isLoading}
        />
      )}
    </div>
  );
};
