/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiSkeletonTitle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AutomationsPanel,
  DescriptionPanel,
  PatternsPanel,
  SourcesPanel,
} from '../components/ai_index_detail';
import { EditSourcesFlyout } from '../components/edit_sources_flyout';
import { useAiIndex } from '../hooks/use_ai_index';
import { useNavigation } from '../hooks/use_navigation';
import { CONTEXT_ENGINE_PATHS } from '../paths';

const backToListLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.backToListButton', {
  defaultMessage: 'Back to AI indexes',
});

export const AiIndexDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { aiIndex, isLoading, error, refetch } = useAiIndex(id);
  const { createContextEngineUrl } = useNavigation();
  const [isEditingSources, setIsEditingSources] = useState(false);

  const landingUrl = createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing);

  if (error) {
    return (
      <KibanaPageTemplate data-test-subj="contextAiIndexDetailPage">
        <KibanaPageTemplate.Section>
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            data-test-subj="contextAiIndexDetailError"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.error.title"
                  defaultMessage="Unable to load AI index"
                />
              </h2>
            }
            body={<p>{error.message}</p>}
            actions={[
              <EuiButton
                key="back-to-list"
                iconType="arrowLeft"
                href={landingUrl}
                data-test-subj="contextAiIndexBackToListButton"
              >
                {backToListLabel}
              </EuiButton>,
            ]}
          />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  return (
    <KibanaPageTemplate data-test-subj="contextAiIndexDetailPage">
      <KibanaPageTemplate.Header
        pageTitle={
          isLoading ? (
            <EuiSkeletonTitle size="l" data-test-subj="contextAiIndexTitleLoading" />
          ) : (
            aiIndex?.id
          )
        }
        rightSideItems={[
          <EuiButtonEmpty
            key="back-to-list"
            iconType="arrowLeft"
            href={landingUrl}
            data-test-subj="contextAiIndexBackToListButton"
          >
            {backToListLabel}
          </EuiButtonEmpty>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <DescriptionPanel isLoading={isLoading} aiIndex={aiIndex} onSaved={refetch} />
        <EuiSpacer size="l" />
        <SourcesPanel
          isLoading={isLoading}
          sources={aiIndex?.sources ?? []}
          canEdit={aiIndex !== undefined}
          onEditSources={() => setIsEditingSources(true)}
        />
        <EuiSpacer size="l" />
        <AutomationsPanel isLoading={isLoading} aiIndex={aiIndex} onSaved={refetch} />
        <EuiSpacer size="l" />
        <PatternsPanel isLoading={isLoading} aiIndex={aiIndex} />
      </KibanaPageTemplate.Section>
      {isEditingSources && aiIndex && (
        <EditSourcesFlyout
          aiIndex={aiIndex}
          onClose={() => setIsEditingSources(false)}
          onSaved={() => {
            setIsEditingSources(false);
            refetch();
          }}
        />
      )}
    </KibanaPageTemplate>
  );
};
