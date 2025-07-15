/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlyoutBody,
  EuiSpacer,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiCode,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  DataStreamMetadata,
  DataStreamResolutionType,
} from '../../../../../../../../../common/types';

interface Props {
  meta?: DataStreamMetadata | null;
  resolutionType?: DataStreamResolutionType;
  close: () => void;
  dataStreamName?: string;
}

const MigrationCompleteStep: React.FunctionComponent<Omit<Props, 'close'>> = ({
  meta,
  resolutionType,
  dataStreamName,
}) => {
  return (
    <>
      <EuiSpacer size="m" />
      <p data-test-subj="dataStreamMigrationCompletedDescription">
        {resolutionType === 'delete' ? (
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.migration.completeStep.changesDescription"
            defaultMessage="Success! Data stream {dataStreamName} successfully deleted."
            values={{
              dataStreamName: dataStreamName && <EuiCode>{dataStreamName}</EuiCode>,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.migration.completeStep.changesDescription"
            defaultMessage="Success! {count, plural, =0 {backing indices} =1 {# backing index} other {# backing indices}} from {dataStreamName} successfully {resolutionType, select, reindex {reindexed} readonly {set to read-only} other {migrated}}."
            values={{
              count: meta?.indicesRequiringUpgradeCount || 0,
              resolutionType,
              dataStreamName: dataStreamName && <EuiCode>{dataStreamName}</EuiCode>,
            }}
          />
        )}
      </p>
    </>
  );
};

export const MigrationCompletedFlyoutStep: React.FunctionComponent<Props> = ({
  meta,
  resolutionType,
  close,
  dataStreamName,
}: Props) => {
  return (
    <>
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3 data-test-subj="dataStreamMigrationCompletedTitle">
            <FormattedMessage
              id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.acceptChangesTitle"
              defaultMessage="Data Stream Migration Complete"
            />
          </h3>
        </EuiTitle>
        <MigrationCompleteStep
          meta={meta}
          resolutionType={resolutionType}
          dataStreamName={dataStreamName}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={close}
              flush="left"
              data-test-subj="closeDataStreamReindexingButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.flyout.completedStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
export const MigrationCompletedModalStep: React.FunctionComponent<Props> = ({
  meta,
  resolutionType,
  close,
  dataStreamName,
}: Props) => {
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="dataStreamModalTitle" size="m">
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.modal.completedStep.title"
            defaultMessage="{resolutionType, select, delete {Deleting data stream completed} other {Setting data stream to read-only completed}}"
            values={{ resolutionType }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <MigrationCompleteStep
          meta={meta}
          resolutionType={resolutionType}
          dataStreamName={dataStreamName}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={close}
              flush="left"
              data-test-subj="closeDataStreamReindexingButton"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.dataStream.migration.modal.completedStep.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
};
