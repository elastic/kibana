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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  DataStreamReindexWarning,
  DataStreamReindexWarningTypes,
  DataStreamMetadata,
} from '../../../../../../../../../common/types';
import { useAppContext } from '../../../../../../../app_context';
import {
  IncompatibleDataInDataStreamWarningCheckbox,
  WarningCheckboxProps,
} from './warning_step_checkbox';

interface CheckedIds {
  [id: string]: boolean;
}

const warningToComponentMap: Record<
  DataStreamReindexWarningTypes,
  React.FunctionComponent<WarningCheckboxProps>
> = {
  incompatibleDataStream: IncompatibleDataInDataStreamWarningCheckbox,
};

export const idForWarning = (id: number) => `reindexWarning-${id}`;
interface WarningsConfirmationFlyoutProps {
  hideWarningsStep: () => void;
  continueReindex: () => void;
  warnings: DataStreamReindexWarning[];
  meta: DataStreamMetadata;
}

/**
 * Displays warning text about destructive changes required to reindex this index. The user
 * must acknowledge each change before being allowed to proceed.
 */
export const ConfirmReindexingFlyoutStep: React.FunctionComponent<
  WarningsConfirmationFlyoutProps
> = ({ warnings, hideWarningsStep, continueReindex, meta }) => {
  const {
    services: {
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
        {warnings.length > 0 && (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.warningsStep.destructiveCallout.calloutTitle"
                  defaultMessage="This operation requires destructive changes that cannot be reversed"
                />
              }
              color="warning"
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.warningsStep.destructiveCallout.calloutDetail"
                  defaultMessage="Ensure data has been backed up before continuing. To proceed with reindexing this data, confirm below."
                />
              </p>
            </EuiCallOut>
            <EuiSpacer />
            <p>
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.dataStreamReindexing.flyout.warningsStep.acceptChangesTitle"
                defaultMessage="{count, plural, =1 {# backing index} other {# backing indices}}, including current write index, will be re-indexed. Current write index will be rolled over first."
                values={{ count: meta.indicesRequiringUpgradeCount }}
              />
            </p>
            <EuiSpacer size="m" />
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
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="arrowLeft" onClick={hideWarningsStep} flush="left">
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.backButtonLabel"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill color="primary" onClick={continueReindex} disabled={blockAdvance}>
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.reindexing.flyout.checklistStep.startReindexingButtonLabel"
                defaultMessage="Start reindexing"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
