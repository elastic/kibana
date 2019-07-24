/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import { SlmPolicy } from '../../../../../../../common/types';
import { useAppDependencies } from '../../../../../index';
import { FormattedDateTime } from '../../../../../components';
import { linkToSnapshot } from '../../../../../services/navigation';

interface Props {
  policy: SlmPolicy;
}

export const TabHistory: React.FunctionComponent<Props> = ({ policy }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;

  const { lastSuccess, lastFailure, nextExecutionMillis, name, repository } = policy;

  const renderLastSuccess = () => {
    if (!lastSuccess) {
      return null;
    }
    const { time, snapshotName } = lastSuccess;

    return (
      <Fragment>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.lastSuccessTitle"
              defaultMessage="Last successful snapshot"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiDescriptionList textStyle="reverse">
          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="successTime">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastSuccess.timeLabel"
                  defaultMessage="Succeeded on"
                  description="Title for date time. Example: Succeeded on Jul 16, 2019 6:30 PM PDT"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                <FormattedDateTime epochMs={time} />
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="successSnapshot">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastSuccess.snapshotNameLabel"
                  defaultMessage="Snapshot name"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                <EuiLink href={linkToSnapshot(repository, snapshotName)}>{snapshotName}</EuiLink>
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>
      </Fragment>
    );
  };

  const renderLastFailure = () => {
    if (!lastFailure) {
      return null;
    }
    const { time, snapshotName, details } = lastFailure;

    return (
      <Fragment>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.lastFailureTitle"
              defaultMessage="Last snapshot failure"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiDescriptionList textStyle="reverse">
          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="failureTime">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastFailure.timeLabel"
                  defaultMessage="Failed on"
                  description="Title for date time. Example: Failed on Jul 16, 2019 6:30 PM PDT"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                <FormattedDateTime epochMs={time} />
              </EuiDescriptionListDescription>
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="failureSnapshot">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastFailure.snapshotNameLabel"
                  defaultMessage="Snapshot name"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                {snapshotName}
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGroup>
            <EuiFlexItem data-test-subj="failureDetails">
              <EuiDescriptionListTitle data-test-subj="title">
                <FormattedMessage
                  id="xpack.snapshotRestore.policyDetails.lastFailure.detailsLabel"
                  defaultMessage="Failure details"
                />
              </EuiDescriptionListTitle>
              <EuiSpacer size="s" />
              <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
                <EuiCodeEditor
                  mode="json"
                  theme="textmate"
                  width="100%"
                  isReadOnly
                  value={JSON.stringify(details, null, 2)}
                  setOptions={{
                    showLineNumbers: false,
                    tabSize: 2,
                    maxLines: Infinity,
                  }}
                  editorProps={{
                    $blockScrolling: Infinity,
                  }}
                  minLines={6}
                  maxLines={6}
                  showGutter={false}
                  aria-label={
                    <FormattedMessage
                      id="xpack.snapshotRestore.policyDetails.lastFailure.detailsAriaLabel"
                      defaultMessage="Last failure details for policy '{name}'"
                      values={{
                        name,
                      }}
                    />
                  }
                />
              </EuiDescriptionListDescription>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiDescriptionList>
      </Fragment>
    );
  };

  return lastSuccess || lastFailure ? (
    <Fragment>
      {renderLastSuccess()}
      {lastSuccess && lastFailure ? <EuiHorizontalRule /> : null}
      {renderLastFailure()}
    </Fragment>
  ) : (
    <EuiText>
      <p>
        <FormattedMessage
          id="xpack.snapshotRestore.policyDetails.noHistoryMessage"
          defaultMessage="This policy has not been executed yet. It will automatically run on {date} at {time}."
          values={{
            date: <FormattedDateTime epochMs={nextExecutionMillis} type="date" />,
            time: <FormattedDateTime epochMs={nextExecutionMillis} type="time" />,
          }}
        />
      </p>
    </EuiText>
  );
};
