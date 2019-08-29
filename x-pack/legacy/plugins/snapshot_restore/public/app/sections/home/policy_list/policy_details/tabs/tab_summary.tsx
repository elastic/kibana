/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiIcon,
  EuiText,
} from '@elastic/eui';

import { SlmPolicy } from '../../../../../../../common/types';
import { useAppDependencies } from '../../../../../index';
import { FormattedDateTime } from '../../../../../components';
import { linkToSnapshots, linkToRepository } from '../../../../../services/navigation';

interface Props {
  policy: SlmPolicy;
}

export const TabSummary: React.FunctionComponent<Props> = ({ policy }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  const {
    version,
    name,
    modifiedDateMillis,
    snapshotName,
    repository,
    schedule,
    nextExecutionMillis,
    config,
  } = policy;
  const { includeGlobalState, ignoreUnavailable, indices, partial } = config || {
    includeGlobalState: undefined,
    ignoreUnavailable: undefined,
    indices: undefined,
    partial: undefined,
  };

  // Only show 10 indices initially
  const [isShowingFullIndicesList, setIsShowingFullIndicesList] = useState<boolean>(false);
  const displayIndices = typeof indices === 'string' ? indices.split(',') : indices;
  const hiddenIndicesCount =
    displayIndices && displayIndices.length > 10 ? displayIndices.length - 10 : 0;
  const shortIndicesList =
    displayIndices && displayIndices.length ? (
      <EuiText size="m">
        <ul>
          {[...displayIndices].splice(0, 10).map((index: string) => (
            <li key={index}>
              <EuiTitle size="xs">
                <span>{index}</span>
              </EuiTitle>
            </li>
          ))}
          {hiddenIndicesCount ? (
            <li key="hiddenIndicesCount">
              <EuiTitle size="xs">
                <EuiLink onClick={() => setIsShowingFullIndicesList(true)}>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyDetails.indicesShowAllLink"
                    defaultMessage="Show {count} more {count, plural, one {index} other {indices}}"
                    values={{ count: hiddenIndicesCount }}
                  />{' '}
                  <EuiIcon type="arrowDown" />
                </EuiLink>
              </EuiTitle>
            </li>
          ) : null}
        </ul>
      </EuiText>
    ) : (
      <FormattedMessage
        id="xpack.snapshotRestore.policyDetails.allIndicesLabel"
        defaultMessage="All indices"
      />
    );
  const fullIndicesList =
    displayIndices && displayIndices.length && displayIndices.length > 10 ? (
      <EuiText size="m">
        <ul>
          {displayIndices.map((index: string) => (
            <li key={index}>
              <EuiTitle size="xs">
                <span>{index}</span>
              </EuiTitle>
            </li>
          ))}
          {hiddenIndicesCount ? (
            <li key="hiddenIndicesCount">
              <EuiTitle size="xs">
                <EuiLink onClick={() => setIsShowingFullIndicesList(false)}>
                  <FormattedMessage
                    id="xpack.snapshotRestore.policyDetails.indicesCollapseAllLink"
                    defaultMessage="Hide {count, plural, one {# index} other {# indices}}"
                    values={{ count: hiddenIndicesCount }}
                  />{' '}
                  <EuiIcon type="arrowUp" />
                </EuiLink>
              </EuiTitle>
            </li>
          ) : null}
        </ul>
      </EuiText>
    ) : null;

  // Reset indices list state when clicking through different policies
  useEffect(() => {
    return () => {
      setIsShowingFullIndicesList(false);
    };
  }, []);

  return (
    <EuiDescriptionList textStyle="reverse">
      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="version">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.versionLabel"
              defaultMessage="Version"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            {version}
          </EuiDescriptionListDescription>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="modified">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.modifiedDateLabel"
              defaultMessage="Last modified"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            <FormattedDateTime epochMs={modifiedDateMillis} />
          </EuiDescriptionListDescription>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="name">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.snapshotNameLabel"
              defaultMessage="Snapshot name"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            <EuiLink href={linkToSnapshots(undefined, name)}>{snapshotName}</EuiLink>
          </EuiDescriptionListDescription>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="repository">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.repositoryLabel"
              defaultMessage="Repository"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            <EuiLink href={linkToRepository(repository)}>{repository}</EuiLink>
          </EuiDescriptionListDescription>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="schedule">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.scheduleLabel"
              defaultMessage="Schedule"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            {schedule}
          </EuiDescriptionListDescription>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="execution">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.nextExecutionLabel"
              defaultMessage="Next snapshot"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            <FormattedDateTime epochMs={nextExecutionMillis} />
          </EuiDescriptionListDescription>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="indices">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.indicesLabel"
              defaultMessage="Indices"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            {isShowingFullIndicesList ? fullIndicesList : shortIndicesList}
          </EuiDescriptionListDescription>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="includeGlobalState">
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
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup>
        <EuiFlexItem data-test-subj="partial">
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
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="includeGlobalState">
          <EuiDescriptionListTitle data-test-subj="title">
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.includeGlobalStateLabel"
              defaultMessage="Include global state"
            />
          </EuiDescriptionListTitle>

          <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
            {includeGlobalState === false ? (
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.includeGlobalStateFalseLabel"
                defaultMessage="No"
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.includeGlobalStateTrueLabel"
                defaultMessage="Yes"
              />
            )}
          </EuiDescriptionListDescription>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiDescriptionList>
  );
};
