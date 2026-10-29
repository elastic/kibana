/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean } from '@kbn/react-hooks';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useRouteMatch } from 'react-router-dom';
import { readKiDocumentLifecycleStatus } from '../../../../common/ki_lifecycle_status';
import type { KiContentPanelSaveFields } from '../../components/ki/view/content/ki_content_panel';
import { ViewKiRawJsonPanel } from '../../components/ki/view/content/view_ki_raw_json_panel';
import { KiContentLayout } from '../../components/ki/view/ki_content_layout';
import { getViewKiHeaderBadges } from '../../components/ki/view/metadata/view_ki_header_badges';
import { useCanWriteContextEngine } from '../../hooks/use_can_write_context_engine';
import { useContextEngineBreadcrumbs } from '../../hooks/use_context_engine_breadcrumbs';
import { useDeleteKi, useRestoreKi, useUpdateKi } from '../../hooks/use_ki_mutations';
import { useKi } from '../../hooks/use_ki';
import { useKibana } from '../../hooks/use_kibana';
import { useNavigation } from '../../hooks/use_navigation';
import { ContextEngineSubPageHeader } from '../../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../../layout/context_engine_page_template';
import {
  CONTEXT_ENGINE_PATHS,
  getAiIndexKnowledgeIndicatorsPath,
  getViewKiDocumentPath,
  getViewKiPath,
} from '../../paths';
import { getKiPageTitle } from './helpers';
import { KiDeleteConfirmModal } from './ki_delete_confirm_modal';
import { KiRestoreConfirmModal } from './ki_restore_confirm_modal';
import { useKiPageDeleteRestoreActions } from './hooks/use_ki_page_delete_restore_actions';
import { useKiPageHeaderMenu } from './hooks/use_ki_page_header_menu';
import { useKiPageHeaderTabs, type KiPageTabId } from './hooks/use_ki_page_header_tabs';
import { useKiPageRouteParams } from './hooks/use_ki_page_route_params';

export const KiPage = () => {
  const { aiIndexId, kiId, index } = useKiPageRouteParams();

  const { ki, isLoading, error } = useKi({
    aiIndexId,
    kiId,
    index,
    enabled: index.length > 0,
  });

  const resolvedKiId = ki?.id ?? kiId;
  const canWrite = useCanWriteContextEngine();
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const {
    services: { notifications, history, http, overlays, application },
  } = useKibana();

  const updateKiMutation = useUpdateKi({ aiIndexId, kiId: resolvedKiId, index });
  const deleteKiMutation = useDeleteKi({ aiIndexId, kiId: resolvedKiId, index });
  const restoreKiMutation = useRestoreKi({ aiIndexId, kiId: resolvedKiId, index });

  const isDocumentTab =
    useRouteMatch({ path: CONTEXT_ENGINE_PATHS.viewKiDocument, exact: true }) !== null;
  const selectedTab: KiPageTabId = isDocumentTab ? 'document' : 'details';
  const [isEditing, { on: startContentEditing, off: exitContentEditing }] = useBoolean(false);

  const { deleteAction, restoreAction } = useKiPageDeleteRestoreActions({
    deleteKiMutation,
    restoreKiMutation,
  });

  const pageTitle = getKiPageTitle(ki, kiId);
  const backPath = getAiIndexKnowledgeIndicatorsPath(aiIndexId);
  const backHref = createContextEngineUrl(backPath);

  useEffect(() => {
    exitContentEditing();
  }, [kiId, selectedTab, exitContentEditing]);

  const handleBackClick = useCallback(
    (event: { preventDefault: () => void }) => {
      event.preventDefault();
      navigateToContextEngine(backPath);
    },
    [backPath, navigateToContextEngine]
  );

  useUnsavedChangesPrompt({
    hasUnsavedChanges: isEditing,
    history,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl: application.navigateToUrl,
    titleText: i18n.translate('xpack.contextEngine.viewKi.discardEditsModal.title', {
      defaultMessage: 'Discard unsaved changes?',
    }),
    messageText: i18n.translate('xpack.contextEngine.viewKi.discardEditsModal.body', {
      defaultMessage: 'Your edits to this Knowledge Indicator will be lost.',
    }),
    cancelButtonText: i18n.translate('xpack.contextEngine.viewKi.discardEditsModal.cancelButton', {
      defaultMessage: 'Keep editing',
    }),
    confirmButtonText: i18n.translate(
      'xpack.contextEngine.viewKi.discardEditsModal.confirmButton',
      {
        defaultMessage: 'Discard changes',
      }
    ),
  });

  const kiTabQueryParams = useMemo(() => (index.length > 0 ? { index } : undefined), [index]);
  const detailsTabHref = useMemo(
    () => createContextEngineUrl(getViewKiPath(aiIndexId, kiId), kiTabQueryParams),
    [aiIndexId, createContextEngineUrl, kiId, kiTabQueryParams]
  );
  const documentTabHref = useMemo(
    () => createContextEngineUrl(getViewKiDocumentPath(aiIndexId, kiId), kiTabQueryParams),
    [aiIndexId, createContextEngineUrl, kiId, kiTabQueryParams]
  );

  useContextEngineBreadcrumbs([{ text: aiIndexId, path: backPath }, { text: pageTitle }]);

  const lifecycleStatus = ki ? readKiDocumentLifecycleStatus(ki.document) : undefined;
  const isDeleted = lifecycleStatus === 'deleted';
  const canEditContent = canWrite && !isDeleted;
  const canDelete = canWrite && !isDeleted && !isEditing;
  const canRestore = canWrite && isDeleted;

  const headerBadges = useMemo(
    () => (ki ? getViewKiHeaderBadges(ki.document, lifecycleStatus) : undefined),
    [ki, lifecycleStatus]
  );

  const showHeaderTabs = index.length > 0 && !error;
  const headerTabs = useKiPageHeaderTabs({
    showHeaderTabs,
    selectedTab,
    detailsTabHref,
    documentTabHref,
  });

  const showContentEditAction = canEditContent && selectedTab === 'details' && !isEditing;

  const headerMenu = useKiPageHeaderMenu({
    ki,
    error,
    showContentEditAction,
    canRestore,
    canDelete,
    onStartContentEditing: startContentEditing,
    onOpenRestoreConfirm: restoreAction.open,
    onOpenDeleteConfirm: deleteAction.open,
    isDeleteLoading: deleteAction.isLoading,
    isRestoreLoading: restoreAction.isLoading,
  });

  const handleSaveContent = useCallback(
    (fields: KiContentPanelSaveFields) => {
      updateKiMutation.mutate(
        { content: fields.content },
        {
          onSuccess: () => {
            exitContentEditing();

            notifications.toasts.addSuccess({
              title: i18n.translate('xpack.contextEngine.viewKi.saveSuccess.title', {
                defaultMessage: 'Knowledge Indicator updated',
              }),
            });
          },
          onError: (updateError) => {
            notifications.toasts.addError(updateError, {
              title: i18n.translate('xpack.contextEngine.viewKi.saveError.title', {
                defaultMessage: 'Unable to update Knowledge Indicator',
              }),
            });
          },
        }
      );
    },
    [exitContentEditing, notifications.toasts, updateKiMutation]
  );

  const showKiContent = index.length > 0 && !error && (isLoading || ki);

  return (
    <ContextEnginePageTemplate data-test-subj="contextViewKiPage">
      <ContextEngineSubPageHeader
        backDestinationLabel={i18n.translate('xpack.contextEngine.viewKi.backDestination', {
          defaultMessage: 'AI index',
        })}
        backHref={backHref}
        onBackClick={handleBackClick}
        pageTitle={pageTitle}
        badges={headerBadges}
        tabs={headerTabs}
        menu={headerMenu}
      />
      <ContextEnginePageSection
        restrictWidth={selectedTab !== 'document'}
        paddingSize={selectedTab === 'document' ? 'none' : 'l'}
      >
        {index.length === 0 ? (
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            data-test-subj="contextViewKiMissingIndex"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.contextEngine.viewKi.missingIndex.title"
                  defaultMessage="Missing index parameter"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.contextEngine.viewKi.missingIndex.body"
                  defaultMessage="Open this page from the Knowledge Indicators list."
                />
              </p>
            }
          />
        ) : null}

        {error ? (
          <EuiEmptyPrompt
            iconType="error"
            color="danger"
            data-test-subj="contextViewKiError"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.contextEngine.viewKi.error.title"
                  defaultMessage="Unable to load Knowledge Indicator"
                />
              </h2>
            }
            body={<p>{error.message}</p>}
          />
        ) : null}

        {showKiContent ? (
          selectedTab === 'document' ? (
            <ViewKiRawJsonPanel document={ki?.document} isLoading={isLoading} />
          ) : (
            <KiContentLayout
              document={ki?.document}
              kiId={resolvedKiId}
              isLoading={isLoading}
              isEditing={canEditContent ? isEditing : false}
              onCancel={canEditContent ? exitContentEditing : undefined}
              isSaving={updateKiMutation.isLoading}
              onSave={canEditContent ? handleSaveContent : undefined}
            />
          )
        ) : null}
      </ContextEnginePageSection>
      {deleteAction.isOpen ? (
        <KiDeleteConfirmModal
          onClose={deleteAction.close}
          onConfirm={deleteAction.confirm}
          isLoading={deleteAction.isLoading}
        />
      ) : null}
      {restoreAction.isOpen ? (
        <KiRestoreConfirmModal
          onClose={restoreAction.close}
          onConfirm={restoreAction.confirm}
          isLoading={restoreAction.isLoading}
        />
      ) : null}
    </ContextEnginePageTemplate>
  );
};
