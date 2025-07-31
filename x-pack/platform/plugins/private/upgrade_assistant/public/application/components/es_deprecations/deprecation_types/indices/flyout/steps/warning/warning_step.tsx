/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EnrichedDeprecationInfo,
  IndexWarning,
  IndexWarningType,
  ReindexAction,
  ReindexStatus,
  ReindexStatusResponse,
} from '../../../../../../../../../common/types';
import { useAppContext } from '../../../../../../../app_context';
import {
  DeprecatedSettingWarningCheckbox,
  ReplaceIndexWithAliasWarningCheckbox,
  MakeIndexReadonlyWarningCheckbox,
  WarningCheckboxProps,
} from './warning_step_checkbox';
import {
  FrozenCallOut,
  FollowerIndexCallout,
  ESTransformsTargetCallout,
  MlAnomalyCallout,
  FetchFailedCallOut,
  ReindexingFailedCallOut,
} from '../callouts';
import { NodesLowSpaceCallOut } from '../../../../../common/nodes_low_disk_space';
import { ReindexState } from '../../../use_reindex';

const ML_ANOMALIES_PREFIX = '.ml-anomalies-';

interface CheckedIds {
  [id: string]: boolean;
}

const warningToComponentMap: {
  [key in IndexWarningType]: React.FunctionComponent<WarningCheckboxProps>;
} = {
  indexSetting: DeprecatedSettingWarningCheckbox,
  replaceIndexWithAlias: ReplaceIndexWithAliasWarningCheckbox,
  makeIndexReadonly: MakeIndexReadonlyWarningCheckbox,
};

export const idForWarning = (id: number) => `reindexWarning-${id}`;
interface WarningFlyoutStepProps {
  closeFlyout: () => void;
  confirm: () => void;
  meta: ReindexStatusResponse['meta'];
  warnings: IndexWarning[];
  deprecation: EnrichedDeprecationInfo;
  reindexState: ReindexState;
}

/**
 * Displays warning text about destructive changes required to reindex this index. The user
 * must acknowledge each change before being allowed to proceed.
 */
export const WarningFlyoutStep: React.FunctionComponent<WarningFlyoutStepProps> = ({
  closeFlyout,
  confirm,
  meta,
  warnings,
  deprecation,
  reindexState,
}) => {
  const {
    services: {
      api,
      core: { docLinks },
    },
  } = useAppContext();
  const { links } = docLinks;

  const [checkedIds, setCheckedIds] = useState<CheckedIds>(
    warnings.reduce((initialCheckedIds, warning, index) => {
      initialCheckedIds[idForWarning(index)] = false;
      return initialCheckedIds;
    }, {} as { [id: string]: boolean })
  );

  const {
    meta: { indexName },
    status: reindexStatus,
  } = reindexState;

  const { data: nodes } = api.useLoadNodeDiskSpace();
  const hasFetchFailed = reindexStatus === ReindexStatus.fetchFailed;
  const hasReindexingFailed = reindexStatus === ReindexStatus.failed;

  const correctiveAction = deprecation?.correctiveAction as ReindexAction;
  const isESTransformTarget = !!correctiveAction?.transformIds?.length;
  const isMLAnomalyIndex = Boolean(indexName?.startsWith(ML_ANOMALIES_PREFIX));

  // Do not allow to proceed until all checkboxes are checked.
  const blockAdvance = Object.values(checkedIds).filter((v) => v).length < warnings.length;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const optionId = e.target.id;

    setCheckedIds((prev) => ({
      ...prev,
      ...{
        [optionId]: !checkedIds[optionId],
      },
    }));
  };

  return (
    <>
      <EuiFlyoutBody>
        {hasFetchFailed && <FetchFailedCallOut errorMessage={reindexState.errorMessage!} />}
        {!hasFetchFailed && hasReindexingFailed && (
          <ReindexingFailedCallOut errorMessage={reindexState.errorMessage!} />
        )}
        {nodes && nodes.length > 0 && <NodesLowSpaceCallOut nodes={nodes} />}
        {meta.isFrozen && <FrozenCallOut />}
        {meta.isFollowerIndex && <FollowerIndexCallout />}
        {isESTransformTarget && <ESTransformsTargetCallout deprecation={deprecation} />}
        {isMLAnomalyIndex && <MlAnomalyCallout />}
        {warnings.length > 0 && (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.reindex.calloutTitle"
                  defaultMessage="This index requires destructive changes that cannot be reversed"
                />
              }
              color="warning"
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.reindex.calloutDetail"
                  defaultMessage="Back up the index before continuing. To proceed with the reindex, accept each change."
                />
              </p>
            </EuiCallOut>

            <EuiSpacer />

            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.acceptChangesTitle"
                  defaultMessage="Accept changes"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer />
            {warnings.map((warning, index) => {
              const WarningCheckbox = warningToComponentMap[warning.warningType];
              return (
                <WarningCheckbox
                  key={idForWarning(index)}
                  isChecked={checkedIds[idForWarning(index)]}
                  onChange={onChange}
                  docLinks={links}
                  id={idForWarning(index)}
                  meta={{ ...meta, ...warning.meta }}
                />
              );
            })}
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj="closeReindexButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="primary"
              onClick={confirm}
              disabled={blockAdvance}
              data-test-subj="startReindexingButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.warningsStep.reindex.continueButtonLabel"
                defaultMessage="Continue reindexing"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
