/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiSpacer,
  EuiToolTip,
  EuiBadge,
  EuiButtonEmpty,
  EuiPageHeader,
  EuiPageTemplate,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { listBreadcrumb, statusBreadcrumb } from '../../lib/breadcrumbs';
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
  const { setBreadcrumbs, toasts } = useAppContext();
  const {
    error: watchDetailError,
    data: watchDetail,
    isLoading: isWatchDetailLoading,
  } = useLoadWatchDetail(id);

  const [selectedTab, setSelectedTab] = useState<WatchStatusTab['id']>('executionHistoryTab');
  const [isActivated, setIsActivated] = useState<boolean | undefined>(undefined);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);
  const [isTogglingActivation, setIsTogglingActivation] = useState<boolean>(false);

  useEffect(() => {
    setBreadcrumbs([listBreadcrumb, statusBreadcrumb]);
  }, [id, setBreadcrumbs]);

  const errorCode = getPageErrorCode(watchDetailError);

  if (isWatchDetailLoading) {
    return (
      <EuiPageTemplate.EmptyPrompt>
        <SectionLoading>
          <FormattedMessage
            id="xpack.watcher.sections.watchStatus.loadingWatchDetailsDescription"
            defaultMessage="Loading watch details…"
          />
        </SectionLoading>
      </EuiPageTemplate.EmptyPrompt>
    );
  }

  if (errorCode) {
    return <PageError errorCode={errorCode} id={id} />;
  }

  if (watchDetail) {
    const { isSystemWatch, id: watchId, watchStatus, name: watchName } = watchDetail;

    if (isActivated === undefined) {
      // Set initial value for isActivated based on the watch we just loaded.
      setIsActivated(typeof watchStatus.isActive !== 'undefined' ? watchStatus.isActive : false);
    }

    const activationButtonText = isActivated ? (
      <FormattedMessage
        id="xpack.watcher.sections.watchHistory.watchTable.deactivateWatchLabel"
        defaultMessage="Deactivate"
      />
    ) : (
      <FormattedMessage
        id="xpack.watcher.sections.watchHistory.watchTable.activateWatchLabel"
        defaultMessage="Activate"
      />
    );

    const toggleWatchActivation = async () => {
      const toggleActivation = isActivated ? deactivateWatch : activateWatch;

      setIsTogglingActivation(true);

      const { error } = await toggleActivation(watchId);

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

    const selectedPanel =
      selectedTab === 'executionHistoryTab' ? (
        <ExecutionHistoryPanel />
      ) : selectedTab === 'actionStatusesTab' ? (
        <ActionStatusesPanel />
      ) : undefined;

    return (
      <WatchDetailsContext.Provider value={{ watchDetailError, watchDetail, isWatchDetailLoading }}>
        <>
          <EuiPageHeader
            pageTitle={
              <>
                <span data-test-subj="pageTitle">
                  <FormattedMessage
                    id="xpack.watcher.sections.watchDetail.header"
                    defaultMessage="Current status for ''{watch}''"
                    values={{
                      watch: watchName ? watchName : watchId,
                    }}
                  />
                </span>
                {isSystemWatch && (
                  <>
                    {' '}
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="xpack.watcher.sections.watchDetail.headerBadgeToolipText"
                          defaultMessage="You cannot deactivate or delete a system watch."
                        />
                      }
                    >
                      <EuiBadge color="hollow">
                        <FormattedMessage
                          id="xpack.watcher.sections.watchDetail.headerBadgeText"
                          defaultMessage="System watch"
                        />
                      </EuiBadge>
                    </EuiToolTip>
                  </>
                )}
              </>
            }
            bottomBorder
            rightSideItems={
              isSystemWatch
                ? []
                : [
                    <EuiButtonEmpty
                      data-test-subj="toggleWatchActivationButton"
                      onClick={() => toggleWatchActivation()}
                      isLoading={isTogglingActivation}
                    >
                      {activationButtonText}
                    </EuiButtonEmpty>,
                    <EuiButtonEmpty
                      data-test-subj="deleteWatchButton"
                      onClick={() => {
                        setWatchesToDelete([watchId]);
                      }}
                      color="danger"
                      disabled={false}
                    >
                      <FormattedMessage
                        id="xpack.watcher.sections.watchHistory.deleteWatchButtonLabel"
                        defaultMessage="Delete"
                      />
                    </EuiButtonEmpty>,
                  ]
            }
            tabs={TABS.map((tab, index) => ({
              onClick: () => {
                setSelectedTab(tab.id);
              },
              isSelected: tab.id === selectedTab,
              key: index,
              'data-test-subj': 'tab',
              label: tab.name,
            }))}
          />

          <EuiSpacer size="l" />

          {selectedPanel}

          <DeleteWatchesModal
            callback={(deleted?: string[]) => {
              if (deleted) {
                goToWatchList();
              }
              setWatchesToDelete([]);
            }}
            watchesToDelete={watchesToDelete}
          />
        </>
      </WatchDetailsContext.Provider>
    );
  }

  return null;
};
