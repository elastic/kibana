/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiSkeletonRectangle, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import type { AppHeaderBadge, AppHeaderMenu, AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  KI_LIST_ACTIVE_AND_DELETED_LIFECYCLE_STATUSES,
  parseKiListLifecycleStatusesQuery,
} from '../../../common/ki_list_lifecycle';
import { isMemoryKiType } from '../../../common/memory';
import type { GetKiResponse } from '../../../common/http_api/knowledge_indicators';
import { AI_INDEX_KNOWLEDGE_INDICATORS_TAB_LOCATION_STATE } from '../ai_index_created_location_state';
import { KiDetailAttributesPanel } from '../components/ki/ki_detail_attributes_panel';
import {
  KiDetailContentPanel,
  type KiDetailContentPanelSaveFields,
} from '../components/ki/ki_detail_content_panel';
import { readKiGovernance } from '../components/ki/ki_detail_helpers';
import { KiDetailMemoryConfirmModals } from '../components/ki/ki_detail_memory_confirm_modals';
import { KiDetailSummary } from '../components/ki/ki_detail_summary';
import { KiDetailMetadataPanel } from '../components/ki/ki_detail_metadata_panel';
import { KiDetailFieldsPanel } from '../components/ki/ki_detail_fields_panel';
import { KiDetailRawJsonPanel } from '../components/ki/ki_detail_raw_json_panel';
import { KiDetailReferencesPanel } from '../components/ki/ki_detail_references_panel';
import { KiDetailTagsPanel } from '../components/ki/ki_detail_tags_panel';
import { getKiDisplayTypeLabel } from '../components/ki/helpers';
import { useAiIndex } from '../hooks/use_ai_index';
import { useCanWriteContextEngine } from '../hooks/use_can_write_context_engine';
import { useForgetMemoryKi, useRestoreMemoryKi, useUpdateKi } from '../hooks/use_ki_mutations';
import { useKi } from '../hooks/use_ki';
import { useKibana } from '../hooks/use_kibana';
import { useNavigation } from '../hooks/use_navigation';
import { ContextEngineSubPageHeader } from '../layout/context_engine_page_header';
import {
  ContextEnginePageSection,
  ContextEnginePageTemplate,
} from '../layout/context_engine_page_template';
import { getAiIndexDetailPath } from '../paths';

type KiDetailTabId = 'details' | 'fields' | 'raw_json';

const backDestinationLabel = i18n.translate('xpack.contextEngine.kiDetail.backDestination', {
  defaultMessage: 'AI index',
});

const detailsTabLabel = i18n.translate('xpack.contextEngine.kiDetail.tabs.details', {
  defaultMessage: 'Details',
});

const fieldsTabLabel = i18n.translate('xpack.contextEngine.kiDetail.tabs.fields', {
  defaultMessage: 'Fields',
});

const rawJsonTabLabel = i18n.translate('xpack.contextEngine.kiDetail.tabs.rawJson', {
  defaultMessage: 'Raw JSON',
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
  const { aiIndex } = useAiIndex(aiIndexId);
  const canWrite = useCanWriteContextEngine();
  const updateKiMutation = useUpdateKi({ aiIndexId, kiId, index });
  const forgetMemoryMutation = useForgetMemoryKi({ aiIndexId, kiId, index });
  const restoreMemoryMutation = useRestoreMemoryKi({ aiIndexId, kiId, index });

  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();

  const [selectedTab, setSelectedTab] = useState<KiDetailTabId>('details');
  const [isForgetConfirmOpen, setIsForgetConfirmOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);

  const pageTitle = getPageTitle(ki, kiId);
  const backHref = createContextEngineUrl(getAiIndexDetailPath(aiIndexId));

  const kiType = typeof ki?.document.type === 'string' ? ki.document.type : undefined;
  const isMemoryKi = kiType !== undefined && isMemoryKiType(kiType);
  const { lifecycleStatus } = ki ? readKiGovernance(ki.document) : { lifecycleStatus: undefined };
  const isDeleted = lifecycleStatus === 'deleted';
  const canEditContent = canWrite && !isDeleted;
  const canForgetMemory = canWrite && isMemoryKi && !isDeleted && aiIndex?.memory_enabled === true;
  const canRestoreMemory = canWrite && isMemoryKi && isDeleted && aiIndex?.memory_enabled === true;

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
        label: detailsTabLabel,
        isSelected: selectedTab === 'details',
        onClick: () => setSelectedTab('details'),
        'data-test-subj': 'contextKiDetailTab-details',
      },
      {
        id: 'fields',
        label: fieldsTabLabel,
        isSelected: selectedTab === 'fields',
        onClick: () => setSelectedTab('fields'),
        'data-test-subj': 'contextKiDetailTab-fields',
      },
      {
        id: 'raw_json',
        label: rawJsonTabLabel,
        isSelected: selectedTab === 'raw_json',
        onClick: () => setSelectedTab('raw_json'),
        'data-test-subj': 'contextKiDetailTab-raw_json',
      },
    ];
  }, [error, ki, selectedTab]);

  const headerMenu = useMemo((): AppHeaderMenu | undefined => {
    if (!ki || error) {
      return undefined;
    }

    if (canRestoreMemory) {
      return {
        primaryActionItem: {
          id: 'restoreMemory',
          label: i18n.translate('xpack.contextEngine.kiDetail.memory.restoreButton', {
            defaultMessage: 'Restore memory',
          }),
          iconType: 'refresh',
          run: () => setIsRestoreConfirmOpen(true),
          isLoading: restoreMemoryMutation.isLoading,
          testId: 'contextKiDetailRestoreButton',
        },
      };
    }

    if (canForgetMemory) {
      return {
        primaryActionItem: {
          id: 'forgetMemory',
          label: i18n.translate('xpack.contextEngine.kiDetail.memory.forgetButton', {
            defaultMessage: 'Forget memory',
          }),
          iconType: 'trash',
          run: () => setIsForgetConfirmOpen(true),
          isLoading: forgetMemoryMutation.isLoading,
          testId: 'contextKiDetailForgetButton',
        },
      };
    }

    return undefined;
  }, [
    canForgetMemory,
    canRestoreMemory,
    error,
    forgetMemoryMutation.isLoading,
    ki,
    restoreMemoryMutation.isLoading,
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

  const handleForgetMemory = useCallback(() => {
    forgetMemoryMutation.mutate(undefined, {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.contextEngine.kiDetail.forgetSuccess.title', {
            defaultMessage: 'Memory forgotten',
          }),
          text: i18n.translate('xpack.contextEngine.kiDetail.forgetSuccess.text', {
            defaultMessage: 'This memory will no longer be recalled by agents.',
          }),
        });
        navigateToContextEngine(
          getAiIndexDetailPath(aiIndexId),
          undefined,
          AI_INDEX_KNOWLEDGE_INDICATORS_TAB_LOCATION_STATE
        );
      },
      onError: (forgetError) => {
        notifications.toasts.addError(forgetError, {
          title: i18n.translate('xpack.contextEngine.kiDetail.forgetError.title', {
            defaultMessage: 'Unable to forget memory',
          }),
        });
      },
    });
  }, [aiIndexId, forgetMemoryMutation, navigateToContextEngine, notifications.toasts]);

  const handleRestoreMemory = useCallback(() => {
    restoreMemoryMutation.mutate(undefined, {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.contextEngine.kiDetail.restoreSuccess.title', {
            defaultMessage: 'Memory restored',
          }),
          text: i18n.translate('xpack.contextEngine.kiDetail.restoreSuccess.text', {
            defaultMessage: 'Agents can recall this memory again.',
          }),
        });
      },
      onError: (restoreError) => {
        notifications.toasts.addError(restoreError, {
          title: i18n.translate('xpack.contextEngine.kiDetail.restoreError.title', {
            defaultMessage: 'Unable to restore memory',
          }),
        });
      },
    });
  }, [notifications.toasts, restoreMemoryMutation]);

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
      selectedTab === 'raw_json' ? (
        <KiDetailRawJsonPanel ki={ki} />
      ) : selectedTab === 'fields' ? (
        <KiDetailFieldsPanel ki={ki} />
      ) : (
        <>
          <KiDetailTagsPanel document={ki.document} />
          <KiDetailSummary document={ki.document} showMemoryFields={isMemoryKi} />
          <KiDetailContentPanel
            document={ki.document}
            canEdit={canEditContent}
            isSaving={updateKiMutation.isLoading}
            onSave={handleSaveContent}
          />
          <EuiSpacer size="m" />
          <KiDetailMetadataPanel kiId={ki.id} backingIndex={index} document={ki.document} />
          <EuiSpacer size="m" />
          <KiDetailAttributesPanel document={ki.document} />
          <EuiSpacer size="m" />
          <KiDetailReferencesPanel document={ki.document} />
        </>
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
      <KiDetailMemoryConfirmModals
        isForgetConfirmOpen={isForgetConfirmOpen}
        onCloseForgetConfirm={() => setIsForgetConfirmOpen(false)}
        onConfirmForget={() => {
          setIsForgetConfirmOpen(false);
          handleForgetMemory();
        }}
        isRestoreConfirmOpen={isRestoreConfirmOpen}
        onCloseRestoreConfirm={() => setIsRestoreConfirmOpen(false)}
        onConfirmRestore={() => {
          setIsRestoreConfirmOpen(false);
          handleRestoreMemory();
        }}
      />
      <ContextEnginePageSection
        restrictWidth={selectedTab === 'raw_json' ? false : undefined}
        paddingSize={selectedTab === 'raw_json' ? 'none' : undefined}
      >
        {pageBody}
      </ContextEnginePageSection>
    </ContextEnginePageTemplate>
  );
};
