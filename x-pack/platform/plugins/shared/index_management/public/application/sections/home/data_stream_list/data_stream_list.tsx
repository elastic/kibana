/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiPageSection,
  EuiEmptyPrompt,
  EuiLink,
  EuiScreenReaderLive,
} from '@elastic/eui';
import type { ScopedHistory } from '@kbn/core/public';

import type { Error } from '../../../../shared_imports';
import {
  PageLoading,
  PageError,
  reactRouterNavigate,
  extractQueryParams,
  attemptToURIDecode,
  APP_WRAPPER_CLASS,
  useExecutionContext,
} from '../../../../shared_imports';
import { Section } from '../../../../../common/constants';
import { useAppContext } from '../../../app_context';
import { useLoadDataStreams } from '../../../services/api';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../../services/breadcrumbs';
import { documentationService } from '../../../services/documentation';
import { DataStreamTable } from './data_stream_table';
import { DataStreamDetailPanel } from './data_stream_detail_panel';
import { filterDataStreams, isManaged } from '../../../lib/data_streams';
import type { Filters } from '../components';
import { useStateWithLocalStorage } from '../../../hooks/use_state_with_localstorage';

const SHOW_PROJECT_LEVEL_RETENTION = 'showProjectLevelRetention';
export const SHOW_MANAGED_DATA_STREAMS = 'IDX_MGMT_SHOW_MANAGED_DATA_STREAMS';
export type DataStreamFilterName = 'managed' | 'hidden';
interface MatchParams {
  dataStreamName?: string;
}

export const DataStreamList: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { dataStreamName },
  },
  location: { search },
  history,
}) => {
  const { isDeepLink, includeHidden } = extractQueryParams(search);
  const decodedDataStreamName = attemptToURIDecode(dataStreamName);

  const {
    config: { enableProjectLevelRetentionChecks, showManagedDataStreamsByDefault },
    core: { getUrlForApp, executionContext },
    plugins: { isFleetEnabled, cloud },
  } = useAppContext();

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'indexManagementDataStreamsTab',
  });

  useEffect(() => {
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.dataStreams);
  }, []);

  const [isIncludeStatsChecked, setIsIncludeStatsChecked] = useState(false);
  const [includeStatsAnnouncement, setIncludeStatsAnnouncement] = useState('');

  const handleIncludeStatsChange = (nextChecked: boolean) => {
    setIsIncludeStatsChecked(nextChecked);
    setIncludeStatsAnnouncement(
      nextChecked
        ? i18n.translate('xpack.idxMgmt.dataStreamListControls.includeStatsSwitchOn', {
            defaultMessage: 'Include stats on',
          })
        : i18n.translate('xpack.idxMgmt.dataStreamListControls.includeStatsSwitchOff', {
            defaultMessage: 'Include stats off',
          })
    );
  };

  const {
    error,
    isInitialRequest,
    isLoading,
    data: dataStreams,
    resendRequest: reload,
  } = useLoadDataStreams({
    includeStats: isIncludeStatsChecked,
  });

  const [projectLevelRetentionCallout, setprojectLevelRetentionCallout] =
    useStateWithLocalStorage<boolean>(SHOW_PROJECT_LEVEL_RETENTION, true);

  const [showManagedDataStreams, setShowManagedDataStreams] = useStateWithLocalStorage<boolean>(
    SHOW_MANAGED_DATA_STREAMS,
    showManagedDataStreamsByDefault
  );

  const [filters, setFilters] = useState<Filters<DataStreamFilterName>>({
    managed: {
      name: i18n.translate('xpack.idxMgmt.dataStreamList.viewManagedLabel', {
        defaultMessage: 'Managed data streams',
      }),
      checked: showManagedDataStreams ? 'on' : 'off',
    },
    hidden: {
      name: i18n.translate('xpack.idxMgmt.dataStreamList.viewHiddenLabel', {
        defaultMessage: 'Hidden data streams',
      }),
      checked: includeHidden ? 'on' : 'off',
    },
  });

  // Only explicit user changes to the managed filter are persisted; filters turned on for a deep link are not.
  const handleViewFilterChange = (nextFilters: Filters<DataStreamFilterName>) => {
    if (nextFilters.managed.checked !== filters.managed.checked) {
      setShowManagedDataStreams(nextFilters.managed.checked === 'on');
    }
    setFilters(nextFilters);
  };

  const selectedDataStream = dataStreams?.find(({ name }) => name === decodedDataStreamName);
  const selectedDataStreamName = selectedDataStream?.name;
  const isSelectedDataStreamHidden = Boolean(selectedDataStream?.hidden);
  const isSelectedDataStreamManaged = selectedDataStream ? isManaged(selectedDataStream) : false;

  // A deep-linked data stream should always be visible in the list, so turn on the view filters
  // that would otherwise exclude it. Keyed on primitives so a reload doesn't re-apply the filters
  // the user may have turned off in the meantime.
  useEffect(() => {
    if (!selectedDataStreamName) {
      return;
    }

    setFilters((currentFilters) => {
      const shouldShowHidden =
        isSelectedDataStreamHidden && currentFilters.hidden.checked === 'off';
      const shouldShowManaged =
        isSelectedDataStreamManaged && currentFilters.managed.checked === 'off';

      if (!shouldShowHidden && !shouldShowManaged) {
        return currentFilters;
      }

      return {
        managed: shouldShowManaged
          ? { ...currentFilters.managed, checked: 'on' }
          : currentFilters.managed,
        hidden: shouldShowHidden
          ? { ...currentFilters.hidden, checked: 'on' }
          : currentFilters.hidden,
      };
    });
  }, [selectedDataStreamName, isSelectedDataStreamHidden, isSelectedDataStreamManaged]);

  const filteredDataStreams = useMemo(() => {
    if (!dataStreams) {
      // If dataStreams are not fetched, return empty array.
      return [];
    }

    const visibleTypes = Object.entries(filters)
      .filter(([name, _filter]) => _filter.checked === 'on')
      .map(([name]) => name);

    return filterDataStreams(dataStreams, visibleTypes);
  }, [dataStreams, filters]);

  const excludedDataStreams = useMemo(() => {
    const visibleDataStreams = new Set(filteredDataStreams);
    return (dataStreams ?? []).filter((dataStream) => !visibleDataStreams.has(dataStream));
  }, [dataStreams, filteredDataStreams]);

  const renderHeader = () => {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiText color="subdued" css={{ maxWidth: '80%' }}>
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamList.dataStreamsDescription"
              defaultMessage="Data streams store time-series data across multiple indices and can be created from index templates. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={documentationService.getDataStreamsDocumentationLink()}
                    target="_blank"
                    external
                  >
                    {i18n.translate('xpack.idxMgmt.dataStreamListDescription.learnMoreLinkText', {
                      defaultMessage: 'Learn more.',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>

        {enableProjectLevelRetentionChecks && (
          <EuiFlexItem grow={false}>
            <EuiLink
              href={cloud?.deploymentUrl}
              target="_blank"
              data-test-subj="projectLevelRetentionLink"
            >
              <FormattedMessage
                id="xpack.idxMgmt.dataStreamList.projectlevelRetention.linkText"
                defaultMessage="Project data retention"
              />
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  let content;

  if (isLoading && isInitialRequest) {
    content = (
      <PageLoading>
        <FormattedMessage
          id="xpack.idxMgmt.dataStreamList.loadingDataStreamsDescription"
          defaultMessage="Loading data streams…"
        />
      </PageLoading>
    );
  } else if (error) {
    content = (
      <PageError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.dataStreamList.loadingDataStreamsErrorMessage"
            defaultMessage="Error loading data streams"
          />
        }
        error={error as Error}
      />
    );
  } else if (Array.isArray(dataStreams) && dataStreams.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1 data-test-subj="title">
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsTitle"
              defaultMessage="You don't have any data streams yet"
            />
          </h1>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsDescription"
              defaultMessage="Data streams store time-series data across multiple indices."
            />
            {' ' /* We need this space to separate these two sentences. */}
            {isFleetEnabled ? (
              <FormattedMessage
                id="xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaFleetMessage"
                defaultMessage="Get started with data streams in {link}."
                values={{
                  link: (
                    <EuiLink
                      data-test-subj="dataStreamsEmptyPromptTemplateLink"
                      href={getUrlForApp('fleet')}
                    >
                      {i18n.translate(
                        'xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaFleetLink',
                        {
                          defaultMessage: 'Fleet',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaIndexTemplateMessage"
                defaultMessage="Get started with data streams by creating a {link}."
                values={{
                  link: (
                    <EuiLink
                      data-test-subj="dataStreamsEmptyPromptTemplateLink"
                      {...reactRouterNavigate(history, {
                        pathname: '/templates',
                      })}
                    >
                      {i18n.translate(
                        'xpack.idxMgmt.dataStreamList.emptyPrompt.noDataStreamsCtaIndexTemplateLink',
                        {
                          defaultMessage: 'composable index template',
                        }
                      )}
                    </EuiLink>
                  ),
                }}
              />
            )}
          </p>
        }
        data-test-subj="emptyPrompt"
      />
    );
  } else {
    content = (
      <EuiPageSection paddingSize="none" data-test-subj="dataStreamList">
        {enableProjectLevelRetentionChecks && projectLevelRetentionCallout && (
          <>
            <KbnInfoCallout
              announceOnMount
              onDismiss={() => setprojectLevelRetentionCallout(false)}
              data-test-subj="projectLevelRetentionCallout"
              title={i18n.translate(
                'xpack.idxMgmt.dataStreamList.projectLevelRetentionCallout.titleText',
                {
                  defaultMessage:
                    'You can now configure data stream retention settings for your entire project',
                }
              )}
              text={
                <FormattedMessage
                  id="xpack.idxMgmt.dataStreamList.projectLevelRetentionCallout.descriptionText"
                  defaultMessage="Optionally define a maximum and default retention period to manage your compliance and storage size needs."
                />
              }
              actionProps={{
                primary: {
                  href: cloud?.deploymentUrl,
                  'data-test-subj': 'cloudLinkButton',
                  children: (
                    <FormattedMessage
                      id="xpack.idxMgmt.dataStreamList.projectLevelRetentionCallout.buttonText"
                      defaultMessage="Get started"
                    />
                  ),
                },
              }}
            />
            <EuiSpacer size="m" />
          </>
        )}

        {renderHeader()}
        <EuiSpacer size="l" />

        <DataStreamTable
          filters={isDeepLink && decodedDataStreamName !== undefined ? decodedDataStreamName : ''}
          dataStreams={filteredDataStreams}
          isLoading={isLoading}
          reload={reload}
          excludedDataStreams={excludedDataStreams}
          viewFilters={filters}
          onViewFilterChange={handleViewFilterChange}
          history={history as ScopedHistory}
          includeStats={isIncludeStatsChecked}
          setIncludeStats={handleIncludeStatsChange}
        />
      </EuiPageSection>
    );
  }

  return (
    <div className={APP_WRAPPER_CLASS}>
      <EuiScreenReaderLive>{includeStatsAnnouncement}</EuiScreenReaderLive>
      {content}

      {/*
        If the user has been deep-linked, they'll expect to see the detail panel because it reflects
        the URL state, even if there are no data streams or if there was an error loading them.
      */}
      {decodedDataStreamName && (
        <DataStreamDetailPanel
          dataStreamName={decodedDataStreamName}
          onClose={(shouldReload?: boolean) => {
            history.push(`/${Section.DataStreams}`);

            // If the data stream was deleted, we need to refresh the list.
            if (shouldReload) {
              reload();
            }
          }}
        />
      )}
    </div>
  );
};
