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
  EuiSpacer,
  EuiTitle,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiText,
  EuiCode,
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
  FollowerIndexCallout,
  ESTransformsTargetCallout,
  MlAnomalyCallout,
  FetchFailedCallOut,
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

interface WarningModalStepProps {
  closeModal: () => void;
  confirm: () => void;
  meta: ReindexStatusResponse['meta'];
  warnings: IndexWarning[];
  deprecation: EnrichedDeprecationInfo;
  reindexState: ReindexState;
  flow: 'readonly' | 'unfreeze';
}

export const WarningModalStep: React.FunctionComponent<WarningModalStepProps> = (props) => {
  return props.flow === 'readonly' ? (
    <WarningReadOnlyModalStep {...props} />
  ) : (
    <WarningUnfreezeModalStep {...props} />
  );
};

const WarningUnfreezeModalStep: React.FunctionComponent<WarningModalStepProps> = ({
  confirm,
  reindexState,
  closeModal,
}) => {
  const {
    services: { api },
  } = useAppContext();

  const {
    status: reindexStatus,
    meta: { indexName },
  } = reindexState;

  const { data: nodes } = api.useLoadNodeDiskSpace();
  const hasFetchFailed = reindexStatus === ReindexStatus.fetchFailed;

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="updateIndexModalTitle" size="m">
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.unfreeze.title"
            defaultMessage="Unfreeze index"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.unfreeze.calloutDetail"
            defaultMessage="Unfreeze {indexName}. This action will also set it to read-only. This ensures that the index will remain compatible with the next major version."
            values={{ indexName: <EuiCode>{indexName}</EuiCode> }}
          />
        </EuiText>
        <EuiSpacer size="m" />
        {hasFetchFailed && <FetchFailedCallOut errorMessage={reindexState.errorMessage!} />}
        {nodes && nodes.length > 0 && <NodesLowSpaceCallOut nodes={nodes} />}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiButtonEmpty
            onClick={closeModal}
            color="primary"
            data-test-subj="startIndexUnfreezeCancelButton"
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.readonly.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
          <EuiButton
            fill
            color="primary"
            onClick={confirm}
            data-test-subj="startIndexUnfreezeButton"
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.readonly.continueButtonLabel"
              data-test-subj="startIndexUnfreezeButton"
              defaultMessage="Unfreeze index"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
};

const WarningReadOnlyModalStep: React.FunctionComponent<WarningModalStepProps> = ({
  confirm,
  meta,
  warnings,
  deprecation,
  reindexState,
  closeModal,
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
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="updateIndexModalTitle" size="m">
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.readonly.title"
            defaultMessage="Set index to read-only"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.readonly.description"
            defaultMessage="Old indices can maintain compatibility with the next major version if they are turned into read-only mode. If you no longer need to update documents in this index (or add new ones), it’s recommended to set it to read-only index."
          />
        </EuiText>
        <EuiSpacer size="m" />
        {hasFetchFailed && <FetchFailedCallOut errorMessage={reindexState.errorMessage!} />}
        {nodes && nodes.length > 0 && <NodesLowSpaceCallOut nodes={nodes} />}
        {meta.isFollowerIndex && <FollowerIndexCallout />}
        {isESTransformTarget && <ESTransformsTargetCallout deprecation={deprecation} />}
        {isMLAnomalyIndex && <MlAnomalyCallout />}
        {warnings.length > 0 && (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.readonly.calloutTitle"
                  defaultMessage="Enable compatibility by setting this index to read-only"
                />
              }
              color="warning"
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.readonly.calloutDetail"
                  defaultMessage="Note that any attempts to insert new documents or update existing ones will fail. You can choose to reindex after upgrading if needed, to convert the index into a writable one."
                />
              </p>
            </EuiCallOut>

            <EuiSpacer />

            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.acceptChangesTitle"
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
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiButtonEmpty
            onClick={closeModal}
            color="primary"
            data-test-subj="warningModalCancelButton"
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.readonly.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
          <EuiButton
            fill
            color="primary"
            onClick={confirm}
            disabled={blockAdvance}
            data-test-subj="startIndexReadonlyButton"
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexModal.warningsStep.readonly.continueButtonLabel"
              data-test-subj="startIndexReadonlyButton"
              defaultMessage="Set to read-only"
            />
          </EuiButton>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
};
