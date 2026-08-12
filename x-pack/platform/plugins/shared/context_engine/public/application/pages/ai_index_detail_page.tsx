/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBack, AppHeaderBadge } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AutomationsPanel,
  DescriptionPanel,
  KnowledgeIndicatorsPanel,
  SourcesPanel,
} from '../components/ai_index_detail';
import { EditSourcesFlyout } from '../components/edit_sources_flyout';
import { useAiIndex } from '../hooks/use_ai_index';
import { useNavigation } from '../hooks/use_navigation';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { CONTEXT_ENGINE_PATHS } from '../paths';

const landingPageTitle = i18n.translate('xpack.contextEngine.landing.title', {
  defaultMessage: 'Context',
});

const managedBadgeLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.managedBadge', {
  defaultMessage: 'Managed',
});

export const AiIndexDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { aiIndex, isLoading, error, refetch } = useAiIndex(id);
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const [isEditingSources, setIsEditingSources] = useState(false);

  const isManaged = aiIndex !== undefined && aiIndex.managed;
  const hideEditControls = isLoading || isManaged;
  const pageTitle = aiIndex?.id ?? id ?? '';

  const back = useMemo<AppHeaderBack>(
    () => ({
      href: createContextEngineUrl(CONTEXT_ENGINE_PATHS.landing),
      label: landingPageTitle,
      onClick: (event) => {
        event.preventDefault();
        navigateToContextEngine(CONTEXT_ENGINE_PATHS.landing);
      },
    }),
    [createContextEngineUrl, navigateToContextEngine]
  );

  const badges = useMemo<AppHeaderBadge[] | undefined>(
    () =>
      isManaged
        ? [
            {
              label: managedBadgeLabel,
              color: 'hollow',
              'data-test-subj': 'contextAiIndexDetailManagedBadge',
            },
          ]
        : undefined,
    [isManaged]
  );

  const pageContent = error ? (
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
  ) : (
    <>
      <DescriptionPanel
        isLoading={isLoading}
        aiIndex={aiIndex}
        onSaved={refetch}
        isManaged={isManaged}
      />
      <EuiSpacer size="m" />
      <SourcesPanel
        isLoading={isLoading}
        sources={aiIndex?.sources ?? []}
        canEdit={aiIndex !== undefined}
        onEditSources={() => setIsEditingSources(true)}
        isManaged={hideEditControls}
      />
      <EuiSpacer size="m" />
      <KnowledgeIndicatorsPanel isLoading={isLoading} aiIndex={aiIndex} />
      <EuiSpacer size="m" />
      <AutomationsPanel
        isLoading={isLoading}
        aiIndex={aiIndex}
        onSaved={refetch}
        isManaged={isManaged}
      />
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
    </>
  );

  return (
    <ContextEnginePageTemplate
      data-test-subj="contextAiIndexDetailPage"
      breadcrumbPageName={pageTitle || undefined}
    >
      <ContextEnginePageSection paddingSize="l">
        <AppHeader spacing="flush" title={pageTitle} back={back} badges={badges} />
      </ContextEnginePageSection>
      <ContextEnginePageSection>{pageContent}</ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
