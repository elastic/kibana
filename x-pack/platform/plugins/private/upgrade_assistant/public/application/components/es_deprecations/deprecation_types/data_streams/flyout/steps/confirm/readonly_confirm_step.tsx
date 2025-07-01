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
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DataStreamMigrationWarning,
  DataStreamWarningTypes,
  DataStreamMetadata,
} from '../../../../../../../../../common/types';
import { useAppContext } from '../../../../../../../app_context';
import {
  IncompatibleDataInDataStreamWarningCheckbox,
  WarningCheckboxProps,
  AffectExistingSetupsWarningCheckbox,
} from './warnings';

import { ReadonlyWarningCallout } from './callouts';
import { DurationClarificationCallOut } from './warnings/warnings_callout';
import { NodesLowSpaceCallOut } from '../../../../../common/nodes_low_disk_space';
interface CheckedIds {
  [id: string]: boolean;
}

const warningToComponentMap: Record<
  DataStreamWarningTypes,
  React.FunctionComponent<WarningCheckboxProps>
> = {
  incompatibleDataStream: IncompatibleDataInDataStreamWarningCheckbox,
  affectExistingSetups: AffectExistingSetupsWarningCheckbox,
};

export const idForWarning = (id: number) => `migrationWarning-${id}`;

/**
 * Displays warning text about changes required to migrate this data stream. The user
 * must acknowledge each change before being allowed to proceed.
 */
export const ConfirmMigrationReadonlyFlyoutStep: React.FunctionComponent<{
  closeModal: () => void;
  startAction: () => void;
  warnings: DataStreamMigrationWarning[];
  meta: DataStreamMetadata;
  lastIndexCreationDateFormatted: string;
}> = ({ closeModal, warnings, startAction, meta, lastIndexCreationDateFormatted }) => {
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

  const { data: nodes } = api.useLoadNodeDiskSpace();
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
        <EuiModalHeaderTitle data-test-subj="readonlyDataStreamModalTitle" size="m">
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.modal.confirmStep.readonly.title"
            defaultMessage="Set data stream to read-only"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <DurationClarificationCallOut
          formattedDate={lastIndexCreationDateFormatted}
          learnMoreUrl={meta.documentationUrl}
        />
        {nodes && nodes.length > 0 && <NodesLowSpaceCallOut nodes={nodes} />}
        {warnings.length > 0 && (
          <>
            <ReadonlyWarningCallout />
            {warnings.map((warning, index) => {
              const WarningCheckbox = warningToComponentMap[warning.warningType];
              return (
                <WarningCheckbox
                  key={idForWarning(index)}
                  isChecked={checkedIds[idForWarning(index)]}
                  onChange={onChange}
                  docLinks={links}
                  id={idForWarning(index)}
                  // @ts-ignore
                  meta={{ ...meta, ...warning.meta }}
                />
              );
            })}
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeModal} data-test-subj="cancelDataStreamMigrationModal">
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.modal.confirmStep.cancelReadOnlyButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="primary"
              onClick={startAction}
              disabled={blockAdvance}
              data-test-subj="startActionButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.modal.checklistStep.startSetReadOnlyButtonLabel"
                defaultMessage="Set all to read-only"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
};
