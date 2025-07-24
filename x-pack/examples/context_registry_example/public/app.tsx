/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { HttpSetup } from '@kbn/core/public';
import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ContextResponse } from '@kbn/context-registry-plugin/common';
import { StartDependencies } from './plugin';
import { SyntheticsMonitorContext } from '../common/types';

export const App = ({ core, plugins }: { core: CoreStart; plugins: StartDependencies }) => {
  const {
    services: { contextRegistry, http },
  } = useKibana<StartDependencies>();
  const [syntheticsMonitorContext, setSyntheticsMonitorContext] = useState<
    Array<ContextResponse<SyntheticsMonitorContext>>
  >([]);

  /* The api, api calling, and type definition is simplified for the example
   * A generic context api is not yet available */
  const loadContext = useCallback(
    async ({
      httpService,
    }: {
      httpService: HttpSetup;
    }): Promise<{ data: Array<ContextResponse<SyntheticsMonitorContext>> }> => {
      return await httpService.post(`/internal/examples/get_example_context`, {
        body: JSON.stringify({
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
          'service.name': 'test-service',
        }),
      });
    },
    []
  );

  useEffect(() => {
    loadContext({ httpService: http }).then((response) => {
      setSyntheticsMonitorContext(response.data);
    });
  }, [http, loadContext, setSyntheticsMonitorContext]);

  const Children = useMemo(
    () => contextRegistry.registry.getContextByKey<SyntheticsMonitorContext>('example').children,
    [contextRegistry]
  );

  if (!syntheticsMonitorContext.length) {
    return <EuiLoadingSpinner size="xl" />;
  }

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Context Registry Example</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageSection>
          <p>
            This example demonstrates how to use the Context Registry to fetch context data for a
            specific service. The context data is fetched from the server and displayed below.
          </p>
          <EuiSpacer size="l" />
          {syntheticsMonitorContext.map((context, index) => (
            <Suspense>
              <Children key={index} context={context} />
            </Suspense>
          ))}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
