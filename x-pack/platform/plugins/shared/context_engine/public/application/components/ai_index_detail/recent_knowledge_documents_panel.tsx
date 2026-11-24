/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { getRouterLinkProps } from '@kbn/router-utils';
import React from 'react';
import { KI_NOT_DELETED_STATUSES } from '../../../../common/ki_lifecycle_status';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { useListKi } from '../../hooks/use_list_ki';
import { useNavigation } from '../../hooks/use_navigation';
import { getAiIndexKnowledgeDocumentsPath, getKnowledgeDocumentLocation } from '../../paths';
import { getKiDisplayTitle } from '../ki/list/list_ki_helpers';
import { KiFormattedDate } from '../ki/shared/ki_formatted_date';
import { KiTypeDisplay } from '../ki/shared/ki_type_display';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';

export const RECENT_KNOWLEDGE_DOCUMENTS_SIZE = 5;

const badgeItemCss = css({ minWidth: 0, maxWidth: '40%' });

interface RecentKnowledgeDocumentRowProps {
  aiIndexId: string;
  ki: KiListItem;
  hasDivider: boolean;
}

const RecentKnowledgeDocumentRow = ({
  aiIndexId,
  ki,
  hasDivider,
}: RecentKnowledgeDocumentRowProps) => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const { path, params } = getKnowledgeDocumentLocation(aiIndexId, ki);
  const { href, onClick } = getRouterLinkProps({
    href: createContextEngineUrl(path, params),
    onClick: () => navigateToContextEngine(path, params),
  });
  const { title, type, updated_at: updatedAt } = ki;

  return (
    <li data-test-subj="contextOverviewRecentDocumentRow">
      {hasDivider ? <EuiHorizontalRule margin="s" aria-hidden={true} /> : null}
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="document" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem className="eui-textTruncate">
          <EuiLink
            href={href}
            onClick={onClick}
            className="eui-textTruncate"
            data-test-subj="contextOverviewRecentDocumentTitle"
            {...getEbtProps({
              element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageOverview,
              action: CONTEXT_ENGINE_UI_EBT.action.overview.OPEN_RECENT_DOCUMENT,
            })}
          >
            <EuiTextTruncate text={getKiDisplayTitle(title)} />
          </EuiLink>
        </EuiFlexItem>
        {/* A long type name must not push the title out: the badge cuts its text with "…". */}
        <EuiFlexItem grow={false} css={badgeItemCss}>
          <KiTypeDisplay as="badge" type={type} />
        </EuiFlexItem>
        {updatedAt ? (
          <EuiFlexItem grow={false} className="eui-textNoWrap">
            <EuiText size="xs" color="subdued">
              <KiFormattedDate value={updatedAt} />
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </li>
  );
};

const getEmptyText = ({
  isManaged,
  isMemoryEnabled,
}: {
  isManaged: boolean;
  isMemoryEnabled: boolean;
}): string => {
  // Users cannot add sources to a managed AI index, so do not ask them to.
  if (isManaged) {
    return i18n.translate(
      'xpack.contextEngine.aiIndexDetail.overview.recentDocuments.emptyManagedBody',
      { defaultMessage: "Knowledge documents appear here after Elastic's automation runs." }
    );
  }
  if (isMemoryEnabled) {
    return i18n.translate(
      'xpack.contextEngine.aiIndexDetail.overview.recentDocuments.emptyMemoryBody',
      {
        defaultMessage:
          "Knowledge documents appear here after you add a source, or after dreaming processes your agent's memories.",
      }
    );
  }
  return i18n.translate('xpack.contextEngine.aiIndexDetail.overview.recentDocuments.emptyBody', {
    defaultMessage: 'Knowledge documents appear here after you add a source.',
  });
};

interface RecentKnowledgeDocumentsPanelProps {
  aiIndexId: string;
  isManaged: boolean;
  isMemoryEnabled: boolean;
}

export const RecentKnowledgeDocumentsPanel = ({
  aiIndexId,
  isManaged,
  isMemoryEnabled,
}: RecentKnowledgeDocumentsPanelProps) => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const { kis, isLoading, error } = useListKi({
    aiIndexId,
    size: RECENT_KNOWLEDGE_DOCUMENTS_SIZE,
    status: KI_NOT_DELETED_STATUSES,
    sort: 'updated',
  });
  const knowledgeDocumentsPath = getAiIndexKnowledgeDocumentsPath(aiIndexId);
  const viewAllLinkProps = getRouterLinkProps({
    href: createContextEngineUrl(knowledgeDocumentsPath),
    onClick: () => navigateToContextEngine(knowledgeDocumentsPath),
  });
  const hasDocuments = kis.length > 0;

  const renderBody = () => {
    if (isLoading) {
      return (
        <>
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={3} data-test-subj="contextOverviewRecentDocumentsLoading" />
        </>
      );
    }
    if (error && !hasDocuments) {
      return (
        <AiIndexDetailPanelDescription data-test-subj="contextOverviewRecentDocumentsError">
          {i18n.translate('xpack.contextEngine.aiIndexDetail.overview.recentDocuments.loadError', {
            defaultMessage: 'Unable to load recent knowledge documents.',
          })}
        </AiIndexDetailPanelDescription>
      );
    }
    if (!hasDocuments) {
      return (
        <AiIndexDetailPanelDescription data-test-subj="contextOverviewRecentDocumentsEmpty">
          {getEmptyText({ isManaged, isMemoryEnabled })}
        </AiIndexDetailPanelDescription>
      );
    }
    return (
      <>
        <EuiSpacer size="m" />
        <EuiFlexGroup
          component="ul"
          direction="column"
          gutterSize="none"
          aria-label={i18n.translate(
            'xpack.contextEngine.aiIndexDetail.overview.recentDocuments.listAriaLabel',
            { defaultMessage: 'Recent knowledge documents' }
          )}
        >
          {kis.map((ki, index) => (
            <RecentKnowledgeDocumentRow
              key={`${ki.index}/${ki.id}`}
              aiIndexId={aiIndexId}
              ki={ki}
              hasDivider={index > 0}
            />
          ))}
        </EuiFlexGroup>
      </>
    );
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextOverviewRecentDocuments">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.contextEngine.aiIndexDetail.overview.recentDocuments.title', {
                defaultMessage: 'Recent knowledge documents',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {hasDocuments ? (
          <EuiFlexItem grow={false}>
            <EuiLink
              {...viewAllLinkProps}
              data-test-subj="contextOverviewRecentDocumentsViewAll"
              {...getEbtProps({
                element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageOverview,
                action: CONTEXT_ENGINE_UI_EBT.action.overview.VIEW_ALL_DOCUMENTS,
              })}
            >
              {i18n.translate(
                'xpack.contextEngine.aiIndexDetail.overview.recentDocuments.viewAllLink',
                { defaultMessage: 'View all' }
              )}
            </EuiLink>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {renderBody()}
    </EuiPanel>
  );
};
