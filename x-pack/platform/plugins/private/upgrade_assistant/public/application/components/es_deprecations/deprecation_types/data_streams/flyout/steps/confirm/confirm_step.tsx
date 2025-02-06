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
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  DataStreamMigrationWarning,
  DataStreamWarningTypes,
  DataStreamMetadata,
  DataStreamResolutionType,
} from '../../../../../../../../../common/types';
import { useAppContext } from '../../../../../../../app_context';
import {
  IncompatibleDataInDataStreamWarningCheckbox,
  WarningCheckboxProps,
  AffectExistingSetupsWarningCheckbox,
} from './warnings';

import { ReindexWarningCallout, ReadonlyWarningCallout } from './callouts';
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
export const ConfirmMigrationFlyoutStep: React.FunctionComponent<{
  hideWarningsStep: () => void;
  startAction: () => void;
  resolutionType: DataStreamResolutionType;
  warnings: DataStreamMigrationWarning[];
  meta: DataStreamMetadata;
}> = ({ warnings, hideWarningsStep, startAction, resolutionType, meta }) => {
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

  const startActionButtonLabel =
    resolutionType === 'reindex'
      ? i18n.translate(
          'xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.startActionButtonLabel',
          {
            defaultMessage: 'Start reindexing',
          }
        )
      : i18n.translate(
          'xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.startActionButtonLabel',
          {
            defaultMessage: 'Mark all read only',
          }
        );

  const actionClarification =
    resolutionType === 'reindex'
      ? i18n.translate(
          'xpack.upgradeAssistant.dataStream.flyout.warningsStep.reindex.acceptChangesTitle',
          {
            defaultMessage:
              '{count, plural, =1 {# backing index} other {# backing indices}}, including current write index, will be re-indexed. Current write index will be rolled over first.',
            values: { count: meta.indicesRequiringUpgradeCount },
          }
        )
      : i18n.translate(
          'xpack.upgradeAssistant.dataStream.flyout.warningsStep.readonly.acceptChangesTitle',
          {
            defaultMessage:
              '{count, plural, =1 {# backing index} other {# backing indices}}, including current write index, will be marked as read only.',
            values: { count: meta.indicesRequiringUpgradeCount },
          }
        );

  const warningsForResolutionType = warnings.filter(
    (warning) => warning.resolutionType === resolutionType
  );

  return (
    <>
      <EuiFlyoutBody>
        {warningsForResolutionType.length > 0 && (
          <>
            {resolutionType === 'reindex' && <ReindexWarningCallout />}
            {resolutionType === 'readonly' && <ReadonlyWarningCallout />}
            <EuiSpacer />
            <p>{actionClarification}</p>
            <EuiSpacer size="m" />
            {warningsForResolutionType.map((warning, index) => {
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
                id="xpack.upgradeAssistant.dataStream.migration.flyout.checklistStep.backButtonLabel"
                defaultMessage="Back"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill color="primary" onClick={startAction} disabled={blockAdvance}>
              {startActionButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
