/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiPanel,
  EuiStat,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { SlmPolicy } from '../../../../../../../common/types';
import { useServices } from '../../../../../app_context';
import { FormattedDateTime, CollapsibleIndicesList } from '../../../../../components';
import { linkToSnapshots, linkToRepository } from '../../../../../services/navigation';
import { PolicyFeatureStatesSummary } from '../../../../../components/summaries';

interface Props {
  policy: SlmPolicy;
}

export const TabSummary: React.FunctionComponent<Props> = ({ policy }) => {
  const { i18n, history } = useServices();

  const {
    version,
    name,
    modifiedDateMillis,
    snapshotName,
    repository,
    schedule,
    nextExecutionMillis,
    config,
    stats,
    retention,
    isManagedPolicy,
  } = policy;
  const { includeGlobalState, featureStates, ignoreUnavailable, indices, partial } = config || {
    includeGlobalState: undefined,
    featureStates: [],
    ignoreUnavailable: undefined,
    indices: undefined,
    partial: undefined,
  };

  return (
    <Fragment>
      {isManagedPolicy ? (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            iconType="iInCircle"
            title={
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.managedPolicyWarningTitle"
                defaultMessage="This is a managed policy used by other systems. Any changes you make might affect how these systems operate."
              />
            }
          />
          <EuiSpacer size="l" />
        </>
      ) : null}
      {/** Stats panel */}
      {stats && (
        <Fragment>
          <EuiPanel hasBorder>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={stats.snapshotsTaken}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyDetails.snapshotsTakenStat',
                    {
                      defaultMessage: 'Snapshots taken',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={stats.snapshotsFailed}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyDetails.snapshotsFailedStat',
                    {
                      defaultMessage: 'Failures',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={stats.snapshotsDeleted}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyDetails.snapshotsDeletedStat',
                    {
                      defaultMessage: 'Deleted',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={stats.snapshotDeletionFailures}
                  description={i18n.translate(
                    'xpack.snapshotRestore.policyDetails.snapshotDeletionFailuresStat',
                    {
                      defaultMessage: 'Deletion failures',
                    }
                  )}
                  titleSize="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer />
        </Fragment>
      )}

      {/** General description list */}
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.policyDetails.generalTitle"
            defaultMessage="General"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="version">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.versionLabel"
                defaultMessage="Version"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              {version}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="modified">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.modifiedDateLabel"
                defaultMessage="Last modified"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              <FormattedDateTime epochMs={modifiedDateMillis} />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="name">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.snapshotNameLabel"
                defaultMessage="Snapshot name"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              <EuiLink {...reactRouterNavigate(history, linkToSnapshots(undefined, name))}>
                {snapshotName}
              </EuiLink>
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="repository">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.repositoryLabel"
                defaultMessage="Repository"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              <EuiLink {...reactRouterNavigate(history, linkToRepository(repository))}>
                {repository}
              </EuiLink>
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="schedule">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.scheduleLabel"
                defaultMessage="Schedule"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              {schedule}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="execution">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.nextExecutionLabel"
                defaultMessage="Next snapshot"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              <FormattedDateTime epochMs={nextExecutionMillis} />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="indices">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.dataStreamsAndIndicesLabel"
                defaultMessage="Data streams and indices"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              <CollapsibleIndicesList indices={indices} />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="ignoreUnavailable">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.ignoreUnavailableLabel"
                defaultMessage="Ignore unavailable indices"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              {ignoreUnavailable ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.ignoreUnavailableTrueLabel"
                  defaultMessage="Yes"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.ignoreUnavailableFalseLabel"
                  defaultMessage="No"
                />
              )}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="includeGlobalState">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.includeGlobalStateLabel"
                defaultMessage="Include global state"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              {includeGlobalState === false ? (
                <FormattedMessage
                  data-test-subj="withoutGlobalState"
                  id="xpack.snapshotRestore.policyDetails.includeGlobalStateFalseLabel"
                  defaultMessage="No"
                />
              ) : (
                <FormattedMessage
                  data-test-subj="withGlobalStateAndFeatureStates"
                  id="xpack.snapshotRestore.policyDetails.includeGlobalStateTrueLabel"
                  defaultMessage="Yes"
                />
              )}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>

        <PolicyFeatureStatesSummary
          includeGlobalState={includeGlobalState}
          featureStates={featureStates}
        />
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="partial">
          <EuiDescriptionList textStyle="reverse">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.partialLabel"
                defaultMessage="Allow partial shards"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              {partial ? (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.partialTrueLabel"
                  defaultMessage="Yes"
                />
              ) : (
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.partialFalseLabel"
                  defaultMessage="No"
                />
              )}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>

      {retention && (
        <Fragment>
          <EuiSpacer size="s" />
          <EuiHorizontalRule />

          {/** Retention description list */}
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.retentionTitle"
                defaultMessage="Retention"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />

          <EuiDescriptionList textStyle="reverse">
            {retention.expireAfterValue && (
              <Fragment>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyDetails.expireAfterLabel"
                    defaultMessage="Delete after"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {retention.expireAfterValue}
                  {retention.expireAfterUnit}
                </EuiDescriptionListDescription>
              </Fragment>
            )}
            {retention.minCount && (
              <Fragment>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyDetails.minCountLabel"
                    defaultMessage="Min count"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{retention.minCount}</EuiDescriptionListDescription>
              </Fragment>
            )}
            {retention.maxCount && (
              <Fragment>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyDetails.maxCountLabel"
                    defaultMessage="Max count"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{retention.maxCount}</EuiDescriptionListDescription>
              </Fragment>
            )}
          </EuiDescriptionList>
        </Fragment>
      )}
    </Fragment>
  );
};
