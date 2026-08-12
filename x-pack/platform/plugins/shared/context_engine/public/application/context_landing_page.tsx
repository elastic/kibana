/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { AiIndexList } from './components/ai_index_list';
import { useListAiIndices } from './hooks/use_list_ai_indices';
import { useNavigation } from './hooks/use_navigation';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from './layout/context_engine_page_template';
import { CONTEXT_ENGINE_PATHS } from './paths';

const landingPageTitle = i18n.translate('xpack.contextEngine.landing.title', {
  defaultMessage: 'Context',
});

const landingPageDescription = i18n.translate('xpack.contextEngine.landing.description', {
  defaultMessage:
    'Manage AI Indexes to organize and retrieve contextual knowledge for your agents.',
});

const createAiIndexButtonLabel = i18n.translate('xpack.contextEngine.createAiIndexButton', {
  defaultMessage: 'Create AI Index',
});

export const ContextLandingPage = () => {
  const { navigateToContextEngine } = useNavigation();
  const { aiIndices, isLoading, error } = useListAiIndices();
  const showHeaderCreateButton = isLoading || error !== undefined || aiIndices.length > 0;

  return (
    <ContextEnginePageTemplate data-test-subj="contextLandingPage">
      <KibanaPageTemplate.Header
        pageTitle={landingPageTitle}
        restrictWidth
        rightSideItems={
          showHeaderCreateButton
            ? [
                <EuiButton
                  key="createAiIndex"
                  fill
                  iconType="plus"
                  data-test-subj="contextCreateAiIndexButton"
                  onClick={() => navigateToContextEngine(CONTEXT_ENGINE_PATHS.create)}
                >
                  {createAiIndexButtonLabel}
                </EuiButton>,
              ]
            : undefined
        }
      >
        <EuiText>{landingPageDescription}</EuiText>
      </KibanaPageTemplate.Header>
      <ContextEnginePageSection>
        <AiIndexList aiIndices={aiIndices} isLoading={isLoading} error={error} />
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
