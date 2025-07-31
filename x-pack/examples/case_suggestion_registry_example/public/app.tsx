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
import { CaseSuggestionResponse } from '@kbn/case-suggestion-registry-plugin/common';
import { StartDependencies } from './plugin';
import { SyntheticsMonitorContext } from '../common/types';

export const App = ({ core, plugins }: { core: CoreStart; plugins: StartDependencies }) => {
  const {
    services: { caseSuggestionRegistry, http },
  } = useKibana<StartDependencies>();
  const [syntheticsMonitorCaseSuggestions, setSyntheticsMonitorCaseSuggestions] = useState<
    Array<CaseSuggestionResponse<SyntheticsMonitorContext>>
  >([]);

  /* The api, api calling, and type definition is simplified for the example
   * A generic case suggestion api is not yet available */
  const loadContext = useCallback(
    async ({
      httpService,
    }: {
      httpService: HttpSetup;
    }): Promise<{ data: Array<CaseSuggestionResponse<SyntheticsMonitorContext>> }> => {
      return await httpService.post(`/internal/examples/get_example_suggestion`, {
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
      setSyntheticsMonitorCaseSuggestions(response.data);
    });
  }, [http, loadContext, setSyntheticsMonitorCaseSuggestions]);

  const Children = useMemo(
    () =>
      caseSuggestionRegistry.registry.getCaseSuggestionByKey<SyntheticsMonitorContext>({
        owner: 'observability',
        key: 'example',
      }).children,
    [caseSuggestionRegistry]
  );

  if (!syntheticsMonitorCaseSuggestions.length) {
    return <EuiLoadingSpinner size="xl" />;
  }

  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Case Suggestion Registry Example</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageSection>
          <p>
            This example demonstrates how to use the Case Suggestion Registry to fetch a suggestion
            based on provided case context. The suggestion is fetched from the server and displayed
            below.
          </p>
          <EuiSpacer size="l" />
          {syntheticsMonitorCaseSuggestions.map((context, index) => (
            <Suspense>
              <Children key={index} caseSuggestion={context} />
            </Suspense>
          ))}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
