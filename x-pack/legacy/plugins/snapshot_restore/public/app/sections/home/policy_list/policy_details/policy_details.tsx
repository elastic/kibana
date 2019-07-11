/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

import { SlmPolicy } from '../../../../../../common/types';
import { useAppDependencies } from '../../../../index';
import { BASE_PATH } from '../../../../constants';
import { useLoadPolicy } from '../../../../services/http';
import { formatDate } from '../../../../services/text';

import { SectionError, SectionLoading } from '../../../../components';

interface Props {
  policyName: SlmPolicy['name'];
  onClose: () => void;
}

export const PolicyDetails: React.FunctionComponent<Props> = ({ policyName, onClose }) => {
  const {
    core: { i18n },
  } = useAppDependencies();

  const { FormattedMessage } = i18n;
  const { error, data: policyDetails } = useLoadPolicy(policyName);

  const renderBody = () => {
    if (policyDetails) {
      return renderPolicy();
    }
    if (error) {
      return renderError();
    }
    return renderLoading();
  };

  const renderLoading = () => {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.snapshotRestore.policyDetails.loadingPolicyDescription"
          defaultMessage="Loading policy…"
        />
      </SectionLoading>
    );
  };

  const renderError = () => {
    const notFound = error.status === 404;
    const errorObject = notFound
      ? {
          data: {
            error: i18n.translate(
              'xpack.snapshotRestore.policyDetails.policyNotFoundErrorMessage',
              {
                defaultMessage: `The policy '{name}' does not exist.`,
                values: {
                  name: policyName,
                },
              }
            ),
          },
        }
      : error;
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.policyDetails.loadingPolicyErrorTitle"
            defaultMessage="Error loading policy"
          />
        }
        error={errorObject}
      />
    );
  };

  const renderPolicy = () => {
    const { policy } = policyDetails;

    if (!policy) {
      return null;
    }

    const {
      version,
      modifiedDateMillis,
      snapshotName,
      repository,
      schedule,
      nextExecutionMillis,
    } = policy as SlmPolicy;

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

          <EuiFlexItem data-test-subj="uuid">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.modifiedDateLabel"
                defaultMessage="Last modified"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              {formatDate(modifiedDateMillis)}
            </EuiDescriptionListDescription>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem data-test-subj="state">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.snapshotNameLabel"
                defaultMessage="Snapshot name"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              <EuiLink href={`#${BASE_PATH}/snapshots?policy=${encodeURIComponent(policyName)}`}>
                {snapshotName}
              </EuiLink>
            </EuiDescriptionListDescription>
          </EuiFlexItem>

          <EuiFlexItem data-test-subj="state">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.repositoryLabel"
                defaultMessage="Repository"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              <EuiLink href={`#${BASE_PATH}/repositories/${encodeURIComponent(repository)}`}>
                {repository}
              </EuiLink>
            </EuiDescriptionListDescription>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup>
          <EuiFlexItem data-test-subj="state">
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

          <EuiFlexItem data-test-subj="state">
            <EuiDescriptionListTitle data-test-subj="title">
              <FormattedMessage
                id="xpack.snapshotRestore.policyDetails.nextExecutionLabel"
                defaultMessage="Next execution"
              />
            </EuiDescriptionListTitle>

            <EuiDescriptionListDescription className="eui-textBreakWord" data-test-subj="value">
              {formatDate(nextExecutionMillis)}
            </EuiDescriptionListDescription>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDescriptionList>
    );
  };

  const renderFooter = () => {
    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            flush="left"
            onClick={onClose}
            data-test-subj="srPolicyDetailsFlyoutCloseButton"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyDetails.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="policyDetail"
      aria-labelledby="srPolicyDetailsFlyoutTitle"
      size="m"
      maxWidth={400}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="srPolicyDetailsFlyoutTitle" data-test-subj="title">
            {policyName}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">{renderBody()}</EuiFlyoutBody>

      <EuiFlyoutFooter>{renderFooter()}</EuiFlyoutFooter>
    </EuiFlyout>
  );
};
