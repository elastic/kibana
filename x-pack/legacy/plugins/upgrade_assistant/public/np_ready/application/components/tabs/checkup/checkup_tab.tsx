/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash';
import React, { Fragment } from 'react';

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLink,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { NEXT_MAJOR_VERSION } from '../../../../../../common/version';
import { LoadingErrorBanner } from '../../error_banner';
import {
  GroupByOption,
  LevelFilterOption,
  LoadingState,
  UpgradeAssistantTabComponent,
  UpgradeAssistantTabProps,
} from '../../types';
import { CheckupControls } from './controls';
import { GroupedDeprecations } from './deprecations/grouped';

interface CheckupTabProps extends UpgradeAssistantTabProps {
  checkupLabel: string;
  showBackupWarning?: boolean;
}

interface CheckupTabState {
  currentFilter: LevelFilterOption;
  search: string;
  currentGroupBy: GroupByOption;
}

/**
 * Displays a list of deprecations that filterable and groupable. Can be used for cluster,
 * nodes, or indices checkups.
 */
export class CheckupTab extends UpgradeAssistantTabComponent<CheckupTabProps, CheckupTabState> {
  constructor(props: CheckupTabProps) {
    super(props);

    this.state = {
      // initialize to all filters
      currentFilter: LevelFilterOption.all,
      search: '',
      currentGroupBy: GroupByOption.message,
    };
  }

  public render() {
    const {
      alertBanner,
      checkupLabel,
      deprecations,
      loadingError,
      loadingState,
      refreshCheckupData,
      setSelectedTabIndex,
      showBackupWarning = false,
    } = this.props;
    const { currentFilter, currentGroupBy } = this.state;

    return (
      <Fragment>
        <EuiSpacer />
        <EuiText grow={false}>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.tabDetail"
              defaultMessage="These {strongCheckupLabel} issues need your attention. Resolve them before upgrading to Elasticsearch {nextEsVersion}."
              values={{
                strongCheckupLabel: <strong>{checkupLabel}</strong>,
                nextEsVersion: `${NEXT_MAJOR_VERSION}.x`,
              }}
            />
          </p>
        </EuiText>

        <EuiSpacer />

        {alertBanner && (
          <Fragment>
            {alertBanner}
            <EuiSpacer />
          </Fragment>
        )}

        {showBackupWarning && (
          <Fragment>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.backUpCallout.calloutTitle"
                  defaultMessage="Back up your indices now"
                />
              }
              color="warning"
              iconType="help"
            >
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.backUpCallout.calloutBody.calloutDetail"
                  defaultMessage="Back up your data using the {snapshotRestoreDocsButton}."
                  values={{
                    snapshotRestoreDocsButton: (
                      <EuiLink
                        href="https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html"
                        target="_blank"
                      >
                        <FormattedMessage
                          id="xpack.upgradeAssistant.checkupTab.backUpCallout.calloutBody.snapshotRestoreDocsButtonLabel"
                          defaultMessage="snapshot and restore APIs"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiCallOut>
            <EuiSpacer />
          </Fragment>
        )}

        <EuiPageContent>
          <EuiPageContentBody>
            {loadingState === LoadingState.Error ? (
              <LoadingErrorBanner loadingError={loadingError} />
            ) : deprecations && deprecations.length > 0 ? (
              <Fragment>
                <CheckupControls
                  allDeprecations={deprecations}
                  loadingState={loadingState}
                  loadData={refreshCheckupData}
                  currentFilter={currentFilter}
                  onFilterChange={this.changeFilter}
                  onSearchChange={this.changeSearch}
                  availableGroupByOptions={this.availableGroupByOptions()}
                  currentGroupBy={currentGroupBy}
                  onGroupByChange={this.changeGroupBy}
                />
                <EuiSpacer />
                {this.renderCheckupData()}
              </Fragment>
            ) : (
              <EuiEmptyPrompt
                iconType="faceHappy"
                title={
                  <h2>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.checkupTab.noIssues.noIssuesTitle"
                      defaultMessage="All clear!"
                    />
                  </h2>
                }
                body={
                  <Fragment>
                    <p data-test-subj="upgradeAssistantIssueSummary">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.checkupTab.noIssues.noIssuesLabel"
                        defaultMessage="You have no {strongCheckupLabel} issues."
                        values={{
                          strongCheckupLabel: <strong>{checkupLabel}</strong>,
                        }}
                      />
                    </p>
                    <p>
                      <FormattedMessage
                        id="xpack.upgradeAssistant.checkupTab.noIssues.nextStepsDetail"
                        defaultMessage="Check the {overviewTabButton} for next steps."
                        values={{
                          overviewTabButton: (
                            <EuiLink onClick={() => setSelectedTabIndex(0)}>
                              <FormattedMessage
                                id="xpack.upgradeAssistant.checkupTab.noIssues.nextStepsDetail.overviewTabButtonLabel"
                                defaultMessage="Overview tab"
                              />
                            </EuiLink>
                          ),
                        }}
                      />
                    </p>
                  </Fragment>
                }
              />
            )}
          </EuiPageContentBody>
        </EuiPageContent>
      </Fragment>
    );
  }

  private changeFilter = (filter: LevelFilterOption) => {
    this.setState({ currentFilter: filter });
  };

  private changeSearch = (search: string) => {
    this.setState({ search });
  };

  private changeGroupBy = (groupBy: GroupByOption) => {
    this.setState({ currentGroupBy: groupBy });
  };

  private availableGroupByOptions() {
    const { deprecations } = this.props;

    if (!deprecations) {
      return [];
    }

    return Object.keys(GroupByOption).filter(opt => find(deprecations, opt)) as GroupByOption[];
  }

  private renderCheckupData() {
    const { deprecations } = this.props;
    const { currentFilter, currentGroupBy, search } = this.state;

    return (
      <GroupedDeprecations
        currentGroupBy={currentGroupBy}
        currentFilter={currentFilter}
        search={search}
        allDeprecations={deprecations}
      />
    );
  }
}
