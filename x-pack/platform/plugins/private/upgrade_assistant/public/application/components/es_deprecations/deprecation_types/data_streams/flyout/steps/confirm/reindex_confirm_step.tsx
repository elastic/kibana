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
  EuiLink,
  EuiSpacer,
  EuiText,
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

import { ReindexWarningCallout } from './callouts';
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
export const ConfirmMigrationReindexFlyoutStep: React.FunctionComponent<{
  closeFlyout: () => void;
  startAction: () => void;
  warnings: DataStreamMigrationWarning[];
  meta: DataStreamMetadata;
  lastIndexCreationDateFormatted: string;
}> = ({ closeFlyout, warnings, startAction, meta, lastIndexCreationDateFormatted }) => {
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
      <EuiFlyoutBody>
        <DurationClarificationCallOut
          formattedDate={lastIndexCreationDateFormatted}
          learnMoreUrl={meta.documentationUrl}
        />
        {nodes && nodes.length > 0 && <NodesLowSpaceCallOut nodes={nodes} />}
        {warnings.length > 0 && (
          <>
            <ReindexWarningCallout />
            <EuiText>
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.flyout.warningsStep.reindex.speedUpMessage"
                defaultMessage="You can increase the speed of reindexing by changing throttling configuration on ES. Where changing throttling configuration allows you to utilize more resources to speed up the reindexing process. {learnMoreHtml}"
                values={{
                  learnMoreHtml: (
                    <EuiLink href={links.upgradeAssistant.dataStreamReindex} target="_blank">
                      <FormattedMessage
                        id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.learnMoreLink"
                        defaultMessage="Learn more"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiText>
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
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj="closeDataStreamConfirmStepButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.flyout.confirmStep.closeButtonLabel"
                defaultMessage="Close"
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
                id="xpack.upgradeAssistant.dataStream.migration.flyout.confirmStep.startActionButtonLabel"
                defaultMessage="Start reindexing"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
