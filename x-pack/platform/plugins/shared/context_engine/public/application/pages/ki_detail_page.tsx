/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  KI_LIST_ACTIVE_AND_DELETED_LIFECYCLE_STATUSES,
  parseKiListLifecycleStatusesQuery,
} from '../../../common/ki_list_lifecycle';
import type { GetKiResponse } from '../../../common/http_api/knowledge_indicators';
import { CONTEXT_ENGINE_UI_EBT } from '../../../common/telemetry';
import { AI_INDEX_KNOWLEDGE_INDICATORS_TAB_LOCATION_STATE } from '../ai_index_created_location_state';
import {
  KiDetailContentPanel,
  type KiDetailContentPanelSaveFields,
} from '../components/ki/ki_detail_content_panel';
import { KiDetailDetailsPanel } from '../components/ki/ki_detail_details_panel';
import { readKiGovernance } from '../components/ki/ki_detail_helpers';
import { KiDetailConfirmModals } from '../components/ki/ki_detail_confirm_modals';
import { KiDetailRawJsonPanel } from '../components/ki/ki_detail_raw_json_panel';
import { getKiDisplayTypeLabel } from '../components/ki/helpers';
import { useCanWriteContextEngine } from '../hooks/use_can_write_context_engine';
import { useDeleteKi, useRestoreKi, useUpdateKi } from '../hooks/use_ki_mutations';
import { useKi } from '../hooks/use_ki';
import { useKibana } from '../hooks/use_kibana';
import { useNavigation } from '../hooks/use_navigation';
import { ContextEngineSubPageHeader } from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { getAiIndexDetailPath } from '../paths';

type KiDetailTabId = 'details' | 'document';

const backDestinationLabel = i18n.translate('xpack.contextEngine.kiDetail.backDestination', {
  defaultMessage: 'AI index',
});

const contentTabLabel = i18n.translate('xpack.contextEngine.kiDetail.tabs.content', {
  defaultMessage: 'Content',
});

const editContentLabel = i18n.translate('xpack.contextEngine.kiDetail.editButton', {
  defaultMessage: 'Edit',
});

const documentTabLabel = i18n.translate('xpack.contextEngine.kiDetail.tabs.document', {
  defaultMessage: 'Document',
});

const getPageTitle = (ki: GetKiResponse | undefined, kiId: string): string => {
  if (!ki) {
    return kiId;
  }
  const titleValue = ki.document.title;
  if (typeof titleValue === 'string' && titleValue.trim().length > 0) {
    return titleValue.trim();
  }
  return ki.id;
};

export const KiDetailPage = () => {
  const { id: aiIndexId = '', kiId = '' } = useParams<{ id: string; kiId: string }>();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const index = searchParams.get('index') ?? '';
  const lifecycleStatuses = useMemo(() => {
    const raw = searchParams.get('lifecycle_status');
    if (raw === null || raw.length === 0) {
      return KI_LIST_ACTIVE_AND_DELETED_LIFECYCLE_STATUSES;
    }
    return parseKiListLifecycleStatusesQuery(raw);
  }, [searchParams]);

  const { ki, isLoading, error } = useKi({
    aiIndexId,
    kiId,
    index,
    lifecycleStatuses,
    enabled: index.length > 0,
  });
  const canWrite = useCanWriteContextEngine();
  const updateKiMutation = useUpdateKi({ aiIndexId, kiId, index });
  const deleteKiMutation = useDeleteKi({ aiIndexId, kiId, index });
  const restoreKiMutation = useRestoreKi({ aiIndexId, kiId, index });

  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();

  const [selectedTab, setSelectedTab] = useState<KiDetailTabId>('details');
  const [isContentEditing, setIsContentEditing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);

  useEffect(() => {
    setIsContentEditing(false);
  }, [kiId, selectedTab]);

  const pageTitle = getPageTitle(ki, kiId);
  const backHref = createContextEngineUrl(getAiIndexDetailPath(aiIndexId));

  const { lifecycleStatus } = ki ? readKiGovernance(ki.document) : { lifecycleStatus: undefined };
  const isDeleted = lifecycleStatus === 'deleted';
  const canEditContent = canWrite && !isDeleted;
  const canDelete = canWrite && !isDeleted;
  const canRestore = canWrite && isDeleted;

  const headerBadges = useMemo((): AppHeaderBadge[] | undefined => {
    if (!ki) {
      return undefined;
    }
    const badges: AppHeaderBadge[] = [];
    const typeValue = ki.document.type;
    if (typeof typeValue === 'string' && typeValue.length > 0) {
      badges.push({
        label: getKiDisplayTypeLabel(typeValue),
        color: 'hollow',
        'data-test-subj': 'contextKiDetailTypeBadge',
      });
    }
    if (lifecycleStatus === 'deleted') {
      badges.push({
        label: i18n.translate('xpack.contextEngine.kiDetail.badge.deleted', {
          defaultMessage: 'Deleted',
        }),
        color: 'danger',
        'data-test-subj': 'contextKiDetailDeletedBadge',
      });
    }
    return badges.length > 0 ? badges : undefined;
  }, [ki, lifecycleStatus]);

  const headerTabs = useMemo((): AppHeaderTab[] | undefined => {
    if (!ki || error) {
      return undefined;
    }

    return [
      {
        id: 'details',
        label: contentTabLabel,
        isSelected: selectedTab === 'details',
        onClick: () => setSelectedTab('details'),
        'data-test-subj': 'contextKiDetailTab-details',
      },
      {
        id: 'document',
        label: documentTabLabel,
        isSelected: selectedTab === 'document',
        onClick: () => setSelectedTab('document'),
        'data-test-subj': 'contextKiDetailTab-document',
      },
    ];
  }, [error, ki, selectedTab]);

  const showContentEditAction = canEditContent && selectedTab === 'details' && !isContentEditing;

  const headerMenu = useMemo((): AppHeaderMenu | undefined => {
    if (!ki || error) {
      return undefined;
    }

    const menuItems = showContentEditAction
      ? [
          {
            id: 'editContent',
            label: editContentLabel,
            iconType: 'pencil',
            overflow: true,
            order: 10,
            run: () => setIsContentEditing(true),
            testId: 'contextKiDetailEditButton',
            ebt: {
              action: CONTEXT_ENGINE_UI_EBT.action.kiDetail.EDIT,
              detail: CONTEXT_ENGINE_UI_EBT.element.kiDetailPage,
            },
          },
        ]
      : [];

    if (canRestore) {
      return {
        primaryActionItem: {
          id: 'restore',
          label: i18n.translate('xpack.contextEngine.kiDetail.restore.button', {
            defaultMessage: 'Restore',
          }),
          iconType: 'refresh',
          run: () => setIsRestoreConfirmOpen(true),
          isLoading: restoreKiMutation.isLoading,
          testId: 'contextKiDetailRestoreButton',
        },
        items: menuItems.length > 0 ? menuItems : undefined,
      };
    }

    if (canDelete) {
      return {
        primaryActionItem: {
          id: 'delete',
          label: i18n.translate('xpack.contextEngine.kiDetail.delete.button', {
            defaultMessage: 'Delete',
          }),
          iconType: 'trash',
          run: () => setIsDeleteConfirmOpen(true),
          isLoading: deleteKiMutation.isLoading,
          testId: 'contextKiDetailDeleteButton',
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
      navigateToContextEngine(
        getAiIndexDetailPath(aiIndexId),
        undefined,
        AI_INDEX_KNOWLEDGE_INDICATORS_TAB_LOCATION_STATE
      );
    },
    [aiIndexId, navigateToContextEngine]
  );

  const handleSaveContent = useCallback(
    (fields: KiDetailContentPanelSaveFields) => {
      updateKiMutation.mutate(
        { content: fields.content },
        {
          onSuccess: () => {
            notifications.toasts.addSuccess({
              title: i18n.translate('xpack.contextEngine.kiDetail.saveSuccess.title', {
                defaultMessage: 'Knowledge Indicator updated',
              }),
            });
          },
          onError: (updateError) => {
            notifications.toasts.addError(updateError, {
              title: i18n.translate('xpack.contextEngine.kiDetail.saveError.title', {
                defaultMessage: 'Unable to update Knowledge Indicator',
              }),
            });
          },
        }
      );
    },
    [notifications.toasts, updateKiMutation]
  );

  const handleDeleteKi = useCallback(() => {
    deleteKiMutation.mutate(undefined, {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.contextEngine.kiDetail.deleteSuccess.title', {
            defaultMessage: 'Knowledge Indicator deleted',
          }),
          text: i18n.translate('xpack.contextEngine.kiDetail.deleteSuccess.text', {
            defaultMessage: 'It will no longer be retrieved by default.',
          }),
        });
        navigateToContextEngine(
          getAiIndexDetailPath(aiIndexId),
          undefined,
          AI_INDEX_KNOWLEDGE_INDICATORS_TAB_LOCATION_STATE
        );
      },
      onError: (deleteError) => {
        notifications.toasts.addError(deleteError, {
          title: i18n.translate('xpack.contextEngine.kiDetail.deleteError.title', {
            defaultMessage: 'Unable to delete Knowledge Indicator',
          }),
        });
      },
    });
  }, [aiIndexId, deleteKiMutation, navigateToContextEngine, notifications.toasts]);

  const handleRestoreKi = useCallback(() => {
    restoreKiMutation.mutate(undefined, {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.contextEngine.kiDetail.restoreSuccess.title', {
            defaultMessage: 'Knowledge Indicator restored',
          }),
          text: i18n.translate('xpack.contextEngine.kiDetail.restoreSuccess.text', {
            defaultMessage: 'It can be retrieved again.',
          }),
        });
      },
      onError: (restoreError) => {
        notifications.toasts.addError(restoreError, {
          title: i18n.translate('xpack.contextEngine.kiDetail.restoreError.title', {
            defaultMessage: 'Unable to restore Knowledge Indicator',
          }),
        });
      },
    });
  }, [notifications.toasts, restoreKiMutation]);

  const missingIndexContent = (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      data-test-subj="contextKiDetailMissingIndex"
      title={
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.missingIndex.title"
            defaultMessage="Missing index parameter"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.missingIndex.body"
            defaultMessage="Open this page from the Knowledge Indicators list."
          />
        </p>
      }
    />
  );

  const errorContent = error ? (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      data-test-subj="contextKiDetailError"
      title={
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.error.title"
            defaultMessage="Unable to load Knowledge Indicator"
          />
        </h2>
      }
      body={<p>{error.message}</p>}
    />
  ) : null;

  const loadingContent = isLoading ? (
    <>
      <EuiSkeletonRectangle height={120} />
      <EuiSpacer size="m" />
      <EuiSkeletonText lines={6} />
    </>
  ) : null;

  const mainContent =
    ki && !error ? (
      selectedTab === 'document' ? (
        <KiDetailRawJsonPanel ki={ki} />
      ) : (
        <EuiFlexGroup
          gutterSize="xl"
          responsive
          alignItems="stretch"
          data-test-subj="contextKiDetailContentTabLayout"
        >
          <EuiFlexItem data-test-subj="contextKiDetailMainColumn">
            <KiDetailContentPanel
              document={ki.document}
              isEditing={isContentEditing}
              onEditingChange={setIsContentEditing}
              isSaving={updateKiMutation.isLoading}
              onSave={handleSaveContent}
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            style={{ width: '26rem' }}
            data-test-subj="contextKiDetailSidebar"
          >
            <KiDetailDetailsPanel kiId={ki.id} document={ki.document} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )
    ) : null;

  const pageBody =
    index.length === 0 ? missingIndexContent : errorContent ?? loadingContent ?? mainContent;

  return (
    <ContextEnginePageTemplate breadcrumbPageName={pageTitle} data-test-subj="contextKiDetailPage">
      <ContextEngineSubPageHeader
        backDestinationLabel={backDestinationLabel}
        backHref={backHref}
        onBackClick={handleBackClick}
        pageTitle={pageTitle}
        badges={headerBadges}
        tabs={headerTabs}
        menu={headerMenu}
      />
      <KiDetailConfirmModals
        isDeleteConfirmOpen={isDeleteConfirmOpen}
        onCloseDeleteConfirm={() => setIsDeleteConfirmOpen(false)}
        onConfirmDelete={() => {
          setIsDeleteConfirmOpen(false);
          handleDeleteKi();
        }}
        isRestoreConfirmOpen={isRestoreConfirmOpen}
        onCloseRestoreConfirm={() => setIsRestoreConfirmOpen(false)}
        onConfirmRestore={() => {
          setIsRestoreConfirmOpen(false);
          handleRestoreKi();
        }}
      />
      <ContextEnginePageSection
        {...(selectedTab === 'document'
          ? { restrictWidth: false, paddingSize: 'none' as const }
          : {})}
      >
        {pageBody}
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
