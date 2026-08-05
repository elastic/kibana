/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSkeletonTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AutomationsPanel, DescriptionPanel, SourcesPanel } from '../components/ai_index_detail';
import { EditSourcesFlyout } from '../components/edit_sources_flyout';
import { useAiIndex } from '../hooks/use_ai_index';

export const AiIndexDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { aiIndex, isLoading, error, refetch } = useAiIndex(id);
  const [isEditingSources, setIsEditingSources] = useState(false);

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
            aiIndex?.name
          )
        }
      />
      <KibanaPageTemplate.Section>
        <DescriptionPanel isLoading={isLoading} description={aiIndex?.description} />
        <EuiSpacer size="l" />
        <SourcesPanel
          isLoading={isLoading}
          sources={aiIndex?.sources ?? []}
          canEdit={aiIndex !== undefined}
          onEditSources={() => setIsEditingSources(true)}
        />
        <EuiSpacer size="l" />
        <AutomationsPanel />
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
