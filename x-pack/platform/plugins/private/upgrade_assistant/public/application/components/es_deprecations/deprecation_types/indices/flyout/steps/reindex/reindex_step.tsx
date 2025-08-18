/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { ReindexStatus } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { ReindexState } from '../../../use_reindex';
import { ReindexProgress } from './progress';
import { useAppContext } from '../../../../../../../app_context';
import { FrozenCallOut } from '../callouts';
import { FetchFailedCallOut } from '../callouts';
import { ReindexingFailedCallOut } from '../callouts';
import { NodesLowSpaceCallOut } from '../../../../../common/nodes_low_disk_space';

const buttonLabel = (status?: ReindexStatus) => {
  switch (status) {
    case ReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexButton.tryAgainLabel"
          defaultMessage="Try again"
        />
      );
    case ReindexStatus.inProgress:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexButton.reindexingLabel"
          defaultMessage="Reindexing…"
        />
      );
    case ReindexStatus.paused:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexButton.resumeLabel"
          defaultMessage="Resume reindexing"
        />
      );
    case ReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexButton.restartLabel"
          defaultMessage="Restart reindexing"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexButton.runReindexLabel"
          defaultMessage="Start reindexing"
        />
      );
  }
};

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */
export const ReindexFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
  cancelReindex: () => void;
}> = ({ closeFlyout, reindexState, startReindex, cancelReindex }) => {
  const {
    services: {
      api,
      core: { docLinks },
    },
  } = useAppContext();

  const { loadingState, status, hasRequiredPrivileges } = reindexState;
  const loading = loadingState === LoadingState.Loading || status === ReindexStatus.inProgress;
  const isCompleted = status === ReindexStatus.completed;
  const hasFetchFailed = status === ReindexStatus.fetchFailed;
  const hasReindexingFailed = status === ReindexStatus.failed;

  const { data: nodes } = api.useLoadNodeDiskSpace();

  return (
    <Fragment>
      <EuiFlyoutBody>
        {reindexState.meta.isFrozen && <FrozenCallOut />}
        {hasRequiredPrivileges === false && (
          <Fragment>
            <EuiSpacer />
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.insufficientPrivilegeCallout.calloutTitle"
                  defaultMessage="You do not have sufficient privileges to reindex this index"
                />
              }
              color="danger"
              iconType="warning"
            />
          </Fragment>
        )}
        {nodes && nodes.length > 0 && <NodesLowSpaceCallOut nodes={nodes} />}
        {hasFetchFailed && <FetchFailedCallOut errorMessage={reindexState.errorMessage!} />}
        {!hasFetchFailed && hasReindexingFailed && (
          <ReindexingFailedCallOut errorMessage={reindexState.errorMessage!} />
        )}
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.reindexDescription"
              defaultMessage="The index will be read-only during reindexing. You won't be able to add, update, or delete documents until reindexing is complete. If you need to reindex to a new cluster, use the reindex API. {docsLink}"
              values={{
                docsLink: (
                  <EuiLink target="_blank" href={docLinks.links.upgradeAssistant.remoteReindex}>
                    {i18n.translate(
                      'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.learnMoreLinkLabel',
                      {
                        defaultMessage: 'Learn more',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.reindexStep.readonlyCallout.backgroundResumeDetail"
              defaultMessage="Reindexing is performed in the background. You can return to the Upgrade Assistant to view progress or resume reindexing after a Kibana restart."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <ReindexProgress reindexState={reindexState} cancelReindex={cancelReindex} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            {!hasFetchFailed && !isCompleted && hasRequiredPrivileges && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color={status === ReindexStatus.paused ? 'warning' : 'primary'}
                  iconType={status === ReindexStatus.paused ? 'play' : undefined}
                  onClick={startReindex}
                  isLoading={loading}
                  disabled={loading || !hasRequiredPrivileges}
                  data-test-subj="startReindexingButton"
                >
                  {buttonLabel(status)}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};
