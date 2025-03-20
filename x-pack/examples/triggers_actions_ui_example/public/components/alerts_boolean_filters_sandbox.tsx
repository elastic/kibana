/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { AlertsFiltersFormContextProvider } from '@kbn/response-ops-alerts-filters-form/contexts/alerts_filters_form_context';
import { HttpStart } from '@kbn/core-http-browser';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { AlertsFiltersForm } from '@kbn/response-ops-alerts-filters-form/components/alerts_filters_form';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertsFiltersExpression } from '@kbn/response-ops-alerts-filters-form/types';

export const AlertsFiltersFormSandbox = ({
  services: { http, notifications },
}: {
  services: {
    http: HttpStart;
    notifications: NotificationsStart;
  };
}) => {
  const [filters, setFilters] = useState<AlertsFiltersExpression>();
  return (
    <AlertsFiltersFormContextProvider value={{ http, notifications, ruleTypeIds: ['.es-query'] }}>
      <EuiPanel
        css={css`
          max-width: 400px;
          margin: 40px auto;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText>
              <h4>
                <FormattedMessage id="alertsFiltersForm.formTitle" defaultMessage="Filters" />
              </h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertsFiltersForm value={filters} onChange={setFilters} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </AlertsFiltersFormContextProvider>
  );
};
