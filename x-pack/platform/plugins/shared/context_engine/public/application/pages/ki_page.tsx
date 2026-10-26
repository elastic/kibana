/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import type { AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { readKiDocumentLifecycleStatus } from '../../../common/ki_lifecycle_status';
import type { GetKiResponse } from '../../../common/http_api/knowledge_indicators';
import { CONTEXT_ENGINE_UI_EBT } from '../../../common/telemetry';
import type { KiContentPanelSaveFields } from '../components/ki/view/content/ki_content_panel';
import { ViewKiRawJsonPanel } from '../components/ki/view/content/view_ki_raw_json_panel';
import { getViewKiHeaderBadges } from '../components/ki/view/metadata/view_ki_header_badges';
import { KiContentLayout } from '../components/ki/view/ki_content_layout';
import { KiDeleteConfirmModal } from '../components/ki/view/ki_delete_confirm_modal';
import { KiRestoreConfirmModal } from '../components/ki/view/ki_restore_confirm_modal';
import { useCanWriteContextEngine } from '../hooks/use_can_write_context_engine';
import { useContextEngineBreadcrumbs } from '../hooks/use_context_engine_breadcrumbs';
import { useDeleteKi, useRestoreKi, useUpdateKi } from '../hooks/use_ki_mutations';
import { useKi } from '../hooks/use_ki';
import { useKibana } from '../hooks/use_kibana';
import { useNavigation } from '../hooks/use_navigation';
import { ContextEngineSubPageHeader } from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { decodeRouteParam, getAiIndexKnowledgeIndicatorsPath } from '../paths';

type ViewKiTabId = 'details' | 'document';

const getPageTitle = (ki: GetKiResponse | undefined, kiId: string): string => {
  if (!ki) {
    return kiId;
  }
  const titleValue = ki.document.title;
  if (titleValue && typeof titleValue === 'string') {
    return titleValue;
  }
  return ki.id;
};

export const KiPage = () => {
  const { id: aiIndexId = '', kiId: kiIdParam = '' } = useParams<{
    id: string;
    kiId: string;
  }>();
  const kiId = useMemo(() => decodeRouteParam(kiIdParam), [kiIdParam]);
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const index = searchParams.get('index') ?? '';

  const { ki, isLoading, error } = useKi({
    aiIndexId,
    kiId,
    index,
    enabled: index.length > 0,
  });

  const resolvedKiId = ki?.id ?? kiId;
  const canWrite = useCanWriteContextEngine();
  const updateKiMutation = useUpdateKi({ aiIndexId, kiId: resolvedKiId, index });
  const deleteKiMutation = useDeleteKi({ aiIndexId, kiId: resolvedKiId, index });
  const restoreKiMutation = useRestoreKi({ aiIndexId, kiId: resolvedKiId, index });

  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();

  const [selectedTab, setSelectedTab] = useState<ViewKiTabId>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);

  useEffect(() => {
    setIsEditing(false);
  }, [kiId, selectedTab]);

  const pageTitle = getPageTitle(ki, kiId);
  const backPath = getAiIndexKnowledgeIndicatorsPath(aiIndexId);
  const backHref = createContextEngineUrl(backPath);

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

  const headerTabs = useMemo((): AppHeaderTab[] | undefined => {
    if (!showHeaderTabs) {
      return undefined;
    }

    return [
      {
        id: 'details',
        label: i18n.translate('xpack.contextEngine.viewKi.tabs.content', {
          defaultMessage: 'Content',
        }),
        isSelected: selectedTab === 'details',
        onClick: () => setSelectedTab('details'),
        'data-test-subj': 'contextViewKiTab-details',
        ...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          action: CONTEXT_ENGINE_UI_EBT.action.viewKi.TAB_DETAILS,
        }),
      },
      {
        id: 'document',
        label: i18n.translate('xpack.contextEngine.viewKi.tabs.document', {
          defaultMessage: 'Document',
        }),
        isSelected: selectedTab === 'document',
        onClick: () => setSelectedTab('document'),
        'data-test-subj': 'contextViewKiTab-document',
        ...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          action: CONTEXT_ENGINE_UI_EBT.action.viewKi.TAB_DOCUMENT,
        }),
      },
    ];
  }, [selectedTab, showHeaderTabs]);

  const showContentEditAction = canEditContent && selectedTab === 'details' && !isEditing;

  const headerMenu = useMemo((): AppHeaderMenu | undefined => {
    if (!ki || error) {
      return undefined;
    }

    const menuItems = showContentEditAction
      ? [
          {
            id: 'editContent',
            label: i18n.translate('xpack.contextEngine.viewKi.editButton', {
              defaultMessage: 'Edit',
            }),
            iconType: 'pencil',
            overflow: true,
            order: 10,
            run: () => setIsEditing(true),
            testId: 'contextViewKiEditButton',
            ebt: {
              action: CONTEXT_ENGINE_UI_EBT.action.editKi.EDIT,
              detail: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
            },
          },
        ]
      : [];

    if (canRestore) {
      return {
        primaryActionItem: {
          id: 'restore',
          label: i18n.translate('xpack.contextEngine.viewKi.restoreButton', {
            defaultMessage: 'Restore',
          }),
          iconType: 'refresh',
          run: () => setIsRestoreConfirmOpen(true),
          isLoading: restoreKiMutation.isLoading,
          testId: 'contextViewKiRestoreButton',
          ebt: {
            action: CONTEXT_ENGINE_UI_EBT.action.viewKi.RESTORE,
            detail: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          },
        },
        items: menuItems.length > 0 ? menuItems : undefined,
      };
    }

    if (canDelete) {
      return {
        primaryActionItem: {
          id: 'delete',
          label: i18n.translate('xpack.contextEngine.viewKi.deleteButton', {
            defaultMessage: 'Delete',
          }),
          iconType: 'trash',
          run: () => setIsDeleteConfirmOpen(true),
          isLoading: deleteKiMutation.isLoading,
          testId: 'contextViewKiDeleteButton',
          ebt: {
            action: CONTEXT_ENGINE_UI_EBT.action.viewKi.DELETE,
            detail: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          },
        },
        items: menuItems.length > 0 ? menuItems : undefined,
      };
    }

    if (menuItems.length > 0) {
      return {
        items: menuItems,
      };
    }

    return undefined;
  }, [
    canDelete,
    canRestore,
    deleteKiMutation.isLoading,
    error,
    ki,
    restoreKiMutation.isLoading,
    showContentEditAction,
  ]);

  const handleBackClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      navigateToContextEngine(backPath);
    },
    [backPath, navigateToContextEngine]
  );

  const handleSaveContent = useCallback(
    (fields: KiContentPanelSaveFields) => {
      updateKiMutation.mutate(
        { content: fields.content },
        {
          onSuccess: () => {
            setIsEditing(false);

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
    [notifications.toasts, updateKiMutation]
  );

  const handleConfirmDelete = useCallback(async () => {
    await deleteKiMutation.mutateAsync(undefined, {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.contextEngine.viewKi.deleteSuccess.title', {
            defaultMessage: 'Knowledge Indicator deleted',
          }),
          text: i18n.translate('xpack.contextEngine.viewKi.deleteSuccess.text', {
            defaultMessage: 'It will no longer be retrieved by default.',
          }),
        });
        setIsDeleteConfirmOpen(false);
      },
      onError: (deleteError) => {
        notifications.toasts.addError(deleteError, {
          title: i18n.translate('xpack.contextEngine.viewKi.deleteError.title', {
            defaultMessage: 'Unable to delete Knowledge Indicator',
          }),
        });
      },
    });
  }, [deleteKiMutation, notifications.toasts]);

  const handleConfirmRestore = useCallback(async () => {
    await restoreKiMutation.mutateAsync(undefined, {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.contextEngine.viewKi.restoreSuccess.title', {
            defaultMessage: 'Knowledge Indicator restored',
          }),
          text: i18n.translate('xpack.contextEngine.viewKi.restoreSuccess.text', {
            defaultMessage: 'It can be retrieved again.',
          }),
        });
        setIsRestoreConfirmOpen(false);
      },
      onError: (restoreError) => {
        notifications.toasts.addError(restoreError, {
          title: i18n.translate('xpack.contextEngine.viewKi.restoreError.title', {
            defaultMessage: 'Unable to restore Knowledge Indicator',
          }),
        });
      },
    });
  }, [notifications.toasts, restoreKiMutation]);

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
              onCancel={canEditContent ? () => setIsEditing(false) : undefined}
              isSaving={updateKiMutation.isLoading}
              onSave={canEditContent ? handleSaveContent : undefined}
            />
          )
        ) : null}
      </ContextEnginePageSection>
      {isDeleteConfirmOpen ? (
        <KiDeleteConfirmModal
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
          isLoading={deleteKiMutation.isLoading}
        />
      ) : null}
      {isRestoreConfirmOpen ? (
        <KiRestoreConfirmModal
          onClose={() => setIsRestoreConfirmOpen(false)}
          onConfirm={handleConfirmRestore}
          isLoading={restoreKiMutation.isLoading}
        />
      ) : null}
    </ContextEnginePageTemplate>
  );
};
