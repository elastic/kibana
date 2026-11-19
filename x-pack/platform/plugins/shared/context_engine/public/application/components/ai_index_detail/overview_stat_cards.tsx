/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { getRouterLinkProps } from '@kbn/router-utils';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { useNavigation } from '../../hooks/use_navigation';
import {
  getAiIndexKnowledgeDocumentsPath,
  getAiIndexSettingsPath,
  getAiIndexSourcesPath,
} from '../../paths';

const NO_VALUE = '-';

interface OverviewStatCardProps {
  id: string;
  label: string;
  value: number | string;
  caption: string;
  path: string;
  isLoading: boolean;
}

const OverviewStatCard = ({
  id,
  label,
  value,
  caption,
  path,
  isLoading,
}: OverviewStatCardProps) => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const { href, onClick } = getRouterLinkProps({
    href: createContextEngineUrl(path),
    onClick: () => navigateToContextEngine(path),
  });

  return (
    <EuiCard
      title={label}
      titleSize="xs"
      titleElement="h3"
      textAlign="left"
      hasBorder
      paddingSize="l"
      href={href}
      onClick={onClick}
      data-test-subj={`contextOverviewStatCard-${id}`}
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageOverview,
        action: CONTEXT_ENGINE_UI_EBT.action.overview.OPEN_STAT_CARD,
        detail: id,
      })}
    >
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiSkeletonTitle size="m" />
      ) : (
        <EuiTitle size="m">
          <p data-test-subj={`contextOverviewStatCardValue-${id}`}>{value}</p>
        </EuiTitle>
      )}
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p data-test-subj={`contextOverviewStatCardCaption-${id}`}>{caption}</p>
      </EuiText>
    </EuiCard>
  );
};

interface OverviewStatCardsProps {
  aiIndexId: string;
  /** `undefined` when the count could not be loaded. */
  knowledgeDocumentsCount: number | undefined;
  sourcesCount: number;
  automationsCount: number;
  isManaged: boolean;
  isMemoryEnabled: boolean;
  isLoading: boolean;
}

/** Counts of the AI index's knowledge documents, sources and automations. Each card opens its tab. */
export const OverviewStatCards = ({
  aiIndexId,
  knowledgeDocumentsCount,
  sourcesCount,
  automationsCount,
  isManaged,
  isMemoryEnabled,
  isLoading,
}: OverviewStatCardsProps) => (
  <EuiFlexGroup gutterSize="m" responsive={true} data-test-subj="contextOverviewStatCards">
    <EuiFlexItem>
      <OverviewStatCard
        id="knowledgeDocuments"
        label={i18n.translate(
          'xpack.contextEngine.aiIndexDetail.overview.statCards.knowledgeDocumentsLabel',
          { defaultMessage: 'Knowledge documents' }
        )}
        value={knowledgeDocumentsCount ?? NO_VALUE}
        caption={
          isMemoryEnabled
            ? i18n.translate(
                'xpack.contextEngine.aiIndexDetail.overview.statCards.knowledgeDocumentsMemoryCaption',
                { defaultMessage: 'from your sources and memories' }
              )
            : i18n.translate(
                'xpack.contextEngine.aiIndexDetail.overview.statCards.knowledgeDocumentsCaption',
                { defaultMessage: 'from your sources' }
              )
        }
        path={getAiIndexKnowledgeDocumentsPath(aiIndexId)}
        isLoading={isLoading}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <OverviewStatCard
        id="sources"
        label={i18n.translate('xpack.contextEngine.aiIndexDetail.overview.statCards.sourcesLabel', {
          defaultMessage: 'Sources',
        })}
        value={isManaged ? NO_VALUE : sourcesCount}
        caption={
          isManaged
            ? i18n.translate(
                'xpack.contextEngine.aiIndexDetail.overview.statCards.sourcesManagedCaption',
                { defaultMessage: 'managed by Elastic' }
              )
            : i18n.translate(
                'xpack.contextEngine.aiIndexDetail.overview.statCards.sourcesCaption',
                { defaultMessage: 'read by your automations' }
              )
        }
        path={getAiIndexSourcesPath(aiIndexId)}
        isLoading={false}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <OverviewStatCard
        id="automations"
        label={i18n.translate(
          'xpack.contextEngine.aiIndexDetail.overview.statCards.automationsLabel',
          { defaultMessage: 'Automations' }
        )}
        value={automationsCount}
        caption={i18n.translate(
          'xpack.contextEngine.aiIndexDetail.overview.statCards.automationsCaption',
          { defaultMessage: 'keep documents up to date' }
        )}
        path={getAiIndexSettingsPath(aiIndexId)}
        isLoading={false}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
