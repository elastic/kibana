/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { StreamsAppPageTemplate } from '../streams_app_page_template';
import { useStreamsAppBreadcrumbs } from '../../hooks/use_streams_app_breadcrumbs';
import { useStreamsAppParams } from '../../hooks/use_streams_app_params';

export function LinkedDashboardView() {
  const {
    path: { key, id },
  } = useStreamsAppParams('/{key}/dashboard/{id}', true);

  const {
    services: { http },
  } = useKibana();

  const [dashboardTitle, setDashboardTitle] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      const response = await http?.fetch(`/api/dashboards/dashboard/${id}`);
      setDashboardTitle((response as any).item.attributes.title);
    }

    loadDashboard();
  }, [id, http]);

  useStreamsAppBreadcrumbs(() => {
    return [
      {
        title: dashboardTitle,
        path: '/{key}/dashboard/{id}',
        params: {
          path: {
            key,
            id,
          },
        },
      },
    ];
  }, [dashboardTitle]);

  return (
    <>
      <StreamsAppPageTemplate.Header
        bottomBorder="extended"
        pageTitle={
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {dashboardTitle}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <StreamsAppPageTemplate.Body grow>
        <DashboardRenderer savedObjectId={id} />
      </StreamsAppPageTemplate.Body>
    </>
  );
}
