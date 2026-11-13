/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonGroup,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { readKiDocumentLifecycleStatus } from '../../../../../common/ki_lifecycle_status';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import type { KiDocument } from '../../../../../common/http_api/knowledge_indicators';
import { useCanWriteContextEngine } from '../../../hooks/use_can_write_context_engine';
import { useKi } from '../../../hooks/use_ki';
import type { SelectedKi } from '../../../hooks/use_selected_ki';
import { resolveKiStatus } from '../../../utils/ki_expiry';
import { getKiDisplayTitle } from '../list/list_ki_helpers';
import { KiFormattedDate } from '../shared/ki_formatted_date';
import { KiLifecycleStatusBadge } from '../shared/ki_lifecycle_status_badge';
import { KiTypeDisplay } from '../shared/ki_type_display';
import { KiContentPanel } from './content/ki_content_panel';
import { ViewKiRawJsonPanel } from './content/view_ki_raw_json_panel';
import { ViewKiMetadataPanel } from './metadata/view_ki_metadata_panel';
import { KiViewerActions } from './ki_viewer_actions';
import { useKiViewerStyles } from './ki_viewer_styles';
import { useKiViewerActions } from './use_ki_viewer_actions';

export type KiViewerMode = 'content' | 'document';

interface KiViewerProps {
  aiIndexId: string;
  selectedKi: SelectedKi;
}

const getUpdatedAt = (document: KiDocument): string | undefined =>
  document.updated_at ?? document['@timestamp'];

const KiViewerBadges = ({ document }: { document: KiDocument }) => {
  const lifecycleStatus = readKiDocumentLifecycleStatus(document);
  const status = resolveKiStatus(lifecycleStatus, document.expires_at);
  const updatedAt = getUpdatedAt(document);

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap
      responsive={false}
      data-test-subj="contextKiViewerBadges"
    >
      <KiTypeDisplay as="badge" type={document.type} data-test-subj="contextViewKiTypeBadge" />
      {status !== 'active' ? (
        <KiLifecycleStatusBadge
          lifecycleStatus={lifecycleStatus}
          expiresAt={document.expires_at}
          data-test-subj="contextViewKiStatusBadge"
        />
      ) : null}
      {(document.tags ?? []).map((tag) => (
        <EuiBadge key={tag} color="default" data-test-subj="contextViewKiTagBadge">
          {tag}
        </EuiBadge>
      ))}
      {updatedAt ? (
        <EuiText size="s" color="subdued" data-test-subj="contextViewKiUpdatedAt">
          <FormattedMessage
            id="xpack.contextEngine.viewKi.updatedAt"
            defaultMessage="Updated {date}"
            values={{ date: <KiFormattedDate value={updatedAt} /> }}
          />
        </EuiText>
      ) : null}
    </EuiFlexGroup>
  );
};

/**
 * The selected Knowledge document, next to the list. Render it with a `key` per document, so
 * each document opens on Content (old `/document` links too) with details closed.
 */
export const KiViewer = ({ aiIndexId, selectedKi: { kiId, index } }: KiViewerProps) => {
  const styles = useKiViewerStyles();
  const detailsId = useGeneratedHtmlId({ prefix: 'contextKiViewerDetails' });
  const [mode, setMode] = useState<KiViewerMode>('content');

  const { ki, isLoading, error } = useKi({
    aiIndexId,
    kiId,
    index,
    enabled: index.length > 0,
  });
  const canWrite = useCanWriteContextEngine();
  const {
    isEditing,
    startEditing,
    stopEditing,
    saveContent,
    isSaving,
    deleteKi,
    isDeleting,
    restoreKi,
    isRestoring,
  } = useKiViewerActions({ aiIndexId, kiId: ki?.id ?? kiId, index });

  const modeOptions = [
    {
      id: 'content',
      label: i18n.translate('xpack.contextEngine.viewKi.mode.content', {
        defaultMessage: 'Content',
      }),
      'data-test-subj': 'contextKiViewerMode-content',
      ...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
        action: CONTEXT_ENGINE_UI_EBT.action.viewKi.TAB_DETAILS,
      }),
    },
    {
      id: 'document',
      label: i18n.translate('xpack.contextEngine.viewKi.mode.document', {
        defaultMessage: 'Document',
      }),
      'data-test-subj': 'contextKiViewerMode-document',
      ...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
        action: CONTEXT_ENGINE_UI_EBT.action.viewKi.TAB_DOCUMENT,
      }),
    },
  ];

  if (index.length === 0) {
    return (
      <EuiPanel hasBorder paddingSize="l" css={styles.panel} data-test-subj="contextKiViewer">
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          titleSize="xs"
          data-test-subj="contextViewKiMissingIndex"
          title={
            <h3>
              <FormattedMessage
                id="xpack.contextEngine.viewKi.missingIndex.title"
                defaultMessage="Missing index parameter"
              />
            </h3>
          }
          body={
            <p>
              <FormattedMessage
                id="xpack.contextEngine.viewKi.missingIndex.body"
                defaultMessage="Open this document from the Knowledge documents list."
              />
            </p>
          }
        />
      </EuiPanel>
    );
  }

  if (error) {
    return (
      <EuiPanel hasBorder paddingSize="l" css={styles.panel} data-test-subj="contextKiViewer">
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          titleSize="xs"
          data-test-subj="contextViewKiError"
          title={
            <h3>
              <FormattedMessage
                id="xpack.contextEngine.viewKi.error.title"
                defaultMessage="Unable to load Knowledge document"
              />
            </h3>
          }
          body={<p>{error.message}</p>}
        />
      </EuiPanel>
    );
  }

  const document = ki?.document;
  const isDeleted = document ? readKiDocumentLifecycleStatus(document) === 'deleted' : false;
  // Today's rule: a deleted document can't be edited.
  const canEdit = canWrite && !isDeleted;
  const showActions = canWrite && document !== undefined && !isEditing;
  const shownMode: KiViewerMode = isEditing ? 'content' : mode;

  return (
    <EuiPanel hasBorder paddingSize="l" css={styles.panel} data-test-subj="contextKiViewer">
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        responsive={false}
        css={styles.titleRow}
        data-test-subj="contextKiViewerTitleRow"
      >
        <EuiFlexItem>
          {document ? (
            <EuiTitle size="xs">
              <h3 css={styles.title} data-test-subj="contextKiViewerTitle">
                {getKiDisplayTitle(document.title)}
              </h3>
            </EuiTitle>
          ) : (
            <EuiSkeletonTitle size="xs" data-test-subj="contextKiViewerTitleLoading" />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.contextEngine.viewKi.mode.legend', {
              defaultMessage: 'Show the document as',
            })}
            options={modeOptions}
            idSelected={shownMode}
            onChange={(id) => setMode(id === 'document' ? 'document' : 'content')}
            isDisabled={isEditing}
            buttonSize="s"
            data-test-subj="contextKiViewerMode"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {document ? (
        <div css={styles.badgesRow}>
          <KiViewerBadges document={document} />
        </div>
      ) : null}

      {shownMode === 'document' ? (
        <ViewKiRawJsonPanel document={document} isLoading={isLoading} />
      ) : (
        <KiContentPanel
          document={document}
          isLoading={isLoading}
          isEditing={canEdit && isEditing}
          onCancel={stopEditing}
          isSaving={isSaving}
          onSave={saveContent}
        />
      )}

      <EuiAccordion
        id={detailsId}
        initialIsOpen={false}
        css={styles.details}
        buttonContent={
          <EuiText size="s" css={styles.detailsTitle}>
            <FormattedMessage
              id="xpack.contextEngine.viewKi.detailsAndAttributes"
              defaultMessage="Details and attributes"
            />
          </EuiText>
        }
        data-test-subj="contextKiViewerDetails"
      >
        <EuiSpacer size="m" />
        <ViewKiMetadataPanel kiId={ki?.id ?? kiId} document={document} isLoading={isLoading} />
      </EuiAccordion>

      {showActions ? (
        <div css={styles.actions}>
          <KiViewerActions
            isDeleted={isDeleted}
            onEdit={startEditing}
            onDelete={deleteKi}
            onRestore={restoreKi}
            isDeleting={isDeleting}
            isRestoring={isRestoring}
          />
        </div>
      ) : null}
    </EuiPanel>
  );
};
