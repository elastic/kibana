/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { getRouterLinkProps } from '@kbn/router-utils';
import React, { useMemo } from 'react';
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

const useRowStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: smallFontSize } = useEuiFontSize('xs');
  return useMemo(
    () => ({
      row: css({
        display: 'flex',
        alignItems: 'center',
        gap: euiTheme.size.m,
        padding: `${euiTheme.size.s} ${euiTheme.size.xs}`,
        borderTop: euiTheme.border.thin,
        color: euiTheme.colors.textParagraph,
        textDecoration: 'none',
        '&:first-of-type': {
          borderTop: 'none',
        },
        '&:hover, &:focus-visible': {
          backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
          textDecoration: 'none',
        },
      }),
      title: css({
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontWeight: euiTheme.font.weight.medium,
      }),
      updated: css({
        flexShrink: 0,
        color: euiTheme.colors.textSubdued,
        fontSize: smallFontSize,
      }),
    }),
    [euiTheme, smallFontSize]
  );
};

const RecentKnowledgeDocumentRow = ({ aiIndexId, ki }: { aiIndexId: string; ki: KiListItem }) => {
  const styles = useRowStyles();
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const { path, params } = getKnowledgeDocumentLocation(aiIndexId, ki);
  const { href, onClick } = getRouterLinkProps({
    href: createContextEngineUrl(path, params),
    onClick: () => navigateToContextEngine(path, params),
  });
  const { title, type, updated_at: updatedAt } = ki;

  return (
    <a
      href={href}
      onClick={onClick}
      css={styles.row}
      data-test-subj="contextOverviewRecentDocumentRow"
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageOverview,
        action: CONTEXT_ENGINE_UI_EBT.action.overview.OPEN_RECENT_DOCUMENT,
      })}
    >
      <EuiIcon type="document" color="subdued" aria-hidden={true} />
      <span css={styles.title} data-test-subj="contextOverviewRecentDocumentTitle">
        {getKiDisplayTitle(title)}
      </span>
      <KiTypeDisplay as="badge" type={type} />
      {updatedAt ? (
        <span css={styles.updated}>
          <KiFormattedDate value={updatedAt} />
        </span>
      ) : null}
    </a>
  );
};

interface RecentKnowledgeDocumentsPanelProps {
  aiIndexId: string;
  isMemoryEnabled: boolean;
}

/** The most recently updated Knowledge documents of the AI index. */
export const RecentKnowledgeDocumentsPanel = ({
  aiIndexId,
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
      {isLoading ? (
        <>
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={3} data-test-subj="contextOverviewRecentDocumentsLoading" />
        </>
      ) : error && !hasDocuments ? (
        <AiIndexDetailPanelDescription data-test-subj="contextOverviewRecentDocumentsError">
          {i18n.translate('xpack.contextEngine.aiIndexDetail.overview.recentDocuments.loadError', {
            defaultMessage: 'Unable to load recent knowledge documents.',
          })}
        </AiIndexDetailPanelDescription>
      ) : hasDocuments ? (
        <>
          <EuiSpacer size="s" />
          <nav
            aria-label={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.overview.recentDocuments.listAriaLabel',
              { defaultMessage: 'Recent knowledge documents' }
            )}
          >
            {kis.map((ki) => (
              <RecentKnowledgeDocumentRow
                key={`${ki.index}/${ki.id}`}
                aiIndexId={aiIndexId}
                ki={ki}
              />
            ))}
          </nav>
        </>
      ) : (
        <AiIndexDetailPanelDescription data-test-subj="contextOverviewRecentDocumentsEmpty">
          {isMemoryEnabled
            ? i18n.translate(
                'xpack.contextEngine.aiIndexDetail.overview.recentDocuments.emptyMemoryBody',
                {
                  defaultMessage:
                    "Knowledge documents appear here after you add a source, or after dreaming processes your agent's memories.",
                }
              )
            : i18n.translate(
                'xpack.contextEngine.aiIndexDetail.overview.recentDocuments.emptyBody',
                {
                  defaultMessage: 'Knowledge documents appear here after you add a source.',
                }
              )}
        </AiIndexDetailPanelDescription>
      )}
    </EuiPanel>
  );
};
