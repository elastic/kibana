/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiBadge, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { listBreadcrumb, statusBreadcrumb } from '../../lib/breadcrumbs';
import { getWatcherListBack } from '../../lib/watcher_app_header';
import { useLoadWatchDetail, deactivateWatch, activateWatch } from '../../lib/api';
import { goToWatchList } from '../../lib/navigation';
import { useAppContext } from '../../app_context';
import { getPageErrorCode, PageError, SectionLoading, DeleteWatchesModal } from '../../components';

import { ActionStatusesPanel, ExecutionHistoryPanel } from './components';
import { WatchDetailsContext } from './watch_details_context';

interface WatchStatusTab {
  id: 'executionHistoryTab' | 'actionStatusesTab';
  name: string;
}

const TABS: WatchStatusTab[] = [
  {
    id: 'executionHistoryTab',
    name: i18n.translate('xpack.watcher.sections.watchStatus.executionHistoryTabLabel', {
      defaultMessage: 'Execution history',
    }),
  },
  {
    id: 'actionStatusesTab',
    name: i18n.translate('xpack.watcher.sections.watchStatus.actionsTabLabel', {
      defaultMessage: 'Action statuses',
    }),
  },
];

const deactivateWatchLabel = i18n.translate(
  'xpack.watcher.sections.watchHistory.watchTable.deactivateWatchLabel',
  { defaultMessage: 'Deactivate' }
);
const activateWatchLabel = i18n.translate(
  'xpack.watcher.sections.watchHistory.watchTable.activateWatchLabel',
  { defaultMessage: 'Activate' }
);
const deleteWatchLabel = i18n.translate(
  'xpack.watcher.sections.watchHistory.deleteWatchButtonLabel',
  { defaultMessage: 'Delete' }
);
const systemWatchBadgeLabel = i18n.translate('xpack.watcher.sections.watchDetail.headerBadgeText', {
  defaultMessage: 'System watch',
});
const systemWatchBadgeTooltip = i18n.translate(
  'xpack.watcher.sections.watchDetail.headerBadgeToolipText',
  {
    defaultMessage: 'You cannot deactivate or delete a system watch.',
  }
);

// TODO: Remove this once non-clickable badges are focusable in AppHeader - tracked in https://github.com/elastic/kibana-team/issues/4062
const renderSystemWatchBadge = ({ badgeText }: { badgeText: string }) => (
  <EuiToolTip content={systemWatchBadgeTooltip}>
    <span tabIndex={0}>
      <EuiBadge color="hollow">{badgeText}</EuiBadge>
    </span>
  </EuiToolTip>
);

export const WatchStatusPage = ({
  match: {
    params: { id },
  },
}: {
  match: {
    params: {
      id: string;
    };
  };
}) => {
  const { setBreadcrumbs, toasts, history } = useAppContext();
  const {
    error: watchDetailError,
    data: watchDetail,
    isLoading: isWatchDetailLoading,
  } = useLoadWatchDetail(id);

  const [selectedTab, setSelectedTab] = useState<WatchStatusTab['id']>('executionHistoryTab');
  const [isActivated, setIsActivated] = useState<boolean | undefined>(undefined);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);
  const [isTogglingActivation, setIsTogglingActivation] = useState<boolean>(false);
  const deleteReturnFocusRef = useRef<(() => void) | undefined>();

  useEffect(() => {
    setBreadcrumbs([listBreadcrumb, statusBreadcrumb]);
  }, [id, setBreadcrumbs]);

  useEffect(() => {
    if (watchesToDelete.length > 0) {
      return;
    }
    const restoreFocus = deleteReturnFocusRef.current;
    if (!restoreFocus) {
      return;
    }
    deleteReturnFocusRef.current = undefined;
    restoreFocus();
  }, [watchesToDelete]);

  const errorCode = getPageErrorCode(watchDetailError);
  const watchName = watchDetail?.name;
  const watchId = watchDetail?.id ?? id;

  const title = i18n.translate('xpack.watcher.sections.watchDetail.header', {
    defaultMessage: "Current status for ''{watch}''",
    values: {
      watch: watchName ? watchName : watchId,
    },
  });

  const isSystemWatch = Boolean(watchDetail?.isSystemWatch);

  const toggleWatchActivation = async () => {
    if (!watchDetail) {
      return;
    }

    const toggleActivation = isActivated ? deactivateWatch : activateWatch;

    setIsTogglingActivation(true);

    const { error } = await toggleActivation(watchDetail.id);

    setIsTogglingActivation(false);

    if (error) {
      const message = isActivated
        ? i18n.translate(
            'xpack.watcher.sections.watchList.toggleActivatationErrorNotification.deactivateDescriptionText',
            {
              defaultMessage: "Couldn't deactivate watch",
            }
          )
        : i18n.translate(
            'xpack.watcher.sections.watchList.toggleActivatationErrorNotification.activateDescriptionText',
            {
              defaultMessage: "Couldn't activate watch",
            }
          );
      return toasts.addDanger(message);
    }

    setIsActivated(!isActivated);
  };

  const menu: AppHeaderMenu | undefined =
    watchDetail && !isSystemWatch
      ? {
          primaryActionItem: {
            id: 'toggleWatchActivation',
            label: isActivated ? deactivateWatchLabel : activateWatchLabel,
            iconType: isActivated ? 'pause' : 'play',
            testId: 'toggleWatchActivationButton',
            isLoading: isTogglingActivation,
            run: () => {
              void toggleWatchActivation();
            },
          },
          items: [
            {
              id: 'deleteWatch',
              label: deleteWatchLabel,
              iconType: 'trash',
              overflow: true,
              isDestructive: true,
              testId: 'deleteWatchButton',
              run: (params) => {
                deleteReturnFocusRef.current = params?.returnFocus;
                setWatchesToDelete([watchDetail.id]);
              },
            },
          ],
        }
      : undefined;

  const header = (
    <AppHeader
      title={title}
      back={getWatcherListBack(history)}
      spacing="bleed"
      badges={
        isSystemWatch
          ? [
              {
                label: systemWatchBadgeLabel,
                renderCustomBadge: renderSystemWatchBadge,
              },
            ]
          : undefined
      }
      tabs={
        watchDetail
          ? TABS.map((tab) => ({
              id: tab.id,
              label: tab.name,
              isSelected: tab.id === selectedTab,
              'data-test-subj': 'tab',
              onClick: () => {
                setSelectedTab(tab.id);
              },
            }))
          : undefined
      }
      menu={menu}
    />
  );

  if (isWatchDetailLoading) {
    return (
      <>
        {header}
        <EuiSpacer size="l" />
        <SectionLoading inline>
          <FormattedMessage
            id="xpack.watcher.sections.watchStatus.loadingWatchDetailsDescription"
            defaultMessage="Loading watch details…"
          />
        </SectionLoading>
      </>
    );
  }

  if (errorCode) {
    return (
      <>
        {header}
        <PageError errorCode={errorCode} id={id} />
      </>
    );
  }

  if (watchDetail) {
    const { watchStatus } = watchDetail;

    if (isActivated === undefined) {
      // Set initial value for isActivated based on the watch we just loaded.
      setIsActivated(typeof watchStatus.isActive !== 'undefined' ? watchStatus.isActive : false);
    }

    const selectedPanel =
      selectedTab === 'executionHistoryTab' ? (
        <ExecutionHistoryPanel />
      ) : selectedTab === 'actionStatusesTab' ? (
        <ActionStatusesPanel />
      ) : undefined;

    return (
      <WatchDetailsContext.Provider value={{ watchDetailError, watchDetail, isWatchDetailLoading }}>
        <>
          {header}

          <EuiSpacer size="l" />

          {selectedPanel}

          <DeleteWatchesModal
            callback={(deleted?: string[]) => {
              if (deleted) {
                deleteReturnFocusRef.current = undefined;
                goToWatchList();
              }
              setWatchesToDelete([]);
            }}
            watchesToDelete={watchesToDelete}
            restoreMenuFocus
          />
        </>
      </WatchDetailsContext.Provider>
    );
  }

  return null;
};
