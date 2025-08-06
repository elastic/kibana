/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
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
import { SuggestionResponse, SuggestionItem } from '@kbn/cases-plugin/common';
import { StartDependencies } from './plugin';
import { SyntheticsMonitorSuggestion } from '../common/types';

/* This is a simplified example of how Cases will use your registered
 * child component to render the suggestion.
 * In reality, the Cases plugin will handle fetching and rendering
 * the suggestion data, and you will only need to provide the
 * `children` component when registering your suggestion type */
import { CaseSuggestionChildren } from './example_suggestion/case_suggestion_children';

export const App = ({ core, plugins }: { core: CoreStart; plugins: StartDependencies }) => {
  const {
    services: { http },
  } = useKibana<StartDependencies>();
  const [syntheticsMonitorCaseSuggestions, setSyntheticsMonitorCaseSuggestions] = useState<
    Array<SuggestionItem>
  >([]);

  /* The api, api calling, and type definition is simplified for the example
   * A generic case suggestion api is not yet available */
  const loadContext = useCallback(
    async ({ httpService }: { httpService: HttpSetup }): Promise<SuggestionResponse> => {
      return await httpService.post(`/internal/case_suggestions/_find`, {
        body: JSON.stringify({
          owners: ['observability'],
          context: {
            timeRange: {
              from: 'now-15m',
              to: 'now',
            },
            'service.name': 'test-service',
          },
        }),
      });
    },
    []
  );

  useEffect(() => {
    loadContext({ httpService: http }).then((response) => {
      /* this is a simplified example
       * In reality, this API should only be consumed by the Cases UI
       * and not directly by the plugin registering the suggestion
       *
       * In this example, We aren't able to type the responses specifically to match the
       * example suggestion here because we are calling the generic api
       * However, in `example_suggestion/case_suggestion_children` you
       * can see an example of how to type the props for your child component
       * to match the response from your suggestion handler */
      setSyntheticsMonitorCaseSuggestions(
        response.suggestions.filter((suggestion) => suggestion.id === 'example')
      );
    });
  }, [http, loadContext, setSyntheticsMonitorCaseSuggestions]);

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
          {/* This is a simplified example of how Cases will use your registered * child component to
          render the suggestion. * In reality, the Cases plugin will handle fetching and rendering *
          the suggestion data, and you will only need to provide the * `children` component when
          registering your suggestion type.

          Note the type casting below. In a real implementation, we would avoid this type casting
          as types will be handled by the Cases Plugin */}
          {syntheticsMonitorCaseSuggestions.map((suggestion, index) => (
            <CaseSuggestionChildren
              suggestion={suggestion as unknown as SuggestionItem<SyntheticsMonitorSuggestion>}
            />
          ))}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
};
