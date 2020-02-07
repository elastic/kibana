/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState, useContext, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
} from '@elastic/eui';
import { Datafeed } from '../../../../common/job_creator/configs';
import { MLJobEditor } from '../../../../../jobs_list/components/ml_job_editor';
import { isValidJson } from '../../../../../../../../common/util/validation_utils';
import { JobCreatorContext } from '../../job_creator_context';

const EDITOR_HEIGHT = '800px';
export enum EDITOR_MODE {
  HIDDEN,
  READONLY,
  EDITABLE,
}
interface Props {
  isDisabled: boolean;
  jobEditorMode: EDITOR_MODE;
  datafeedEditorMode: EDITOR_MODE;
}
export const JsonEditorFlyout: FC<Props> = ({ isDisabled, jobEditorMode, datafeedEditorMode }) => {
  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const [showJsonFlyout, setShowJsonFlyout] = useState(false);

  const [jobConfigString, setJobConfigString] = useState(jobCreator.formattedJobJson);
  const [datafeedConfigString, setDatafeedConfigString] = useState(
    jobCreator.formattedDatafeedJson
  );
  const [saveable, setSaveable] = useState(false);

  useEffect(() => {
    setJobConfigString(jobCreator.formattedJobJson);
    setDatafeedConfigString(jobCreator.formattedDatafeedJson);
  }, [jobCreatorUpdated]);

  const editJsonMode =
    jobEditorMode === EDITOR_MODE.HIDDEN || datafeedEditorMode === EDITOR_MODE.HIDDEN;
  const flyOutSize = editJsonMode ? 'm' : 'l';
  const readOnlyMode =
    jobEditorMode === EDITOR_MODE.READONLY && datafeedEditorMode === EDITOR_MODE.READONLY;

  function toggleJsonFlyout() {
    setSaveable(false);
    setShowJsonFlyout(!showJsonFlyout);
  }

  function onJobChange(json: string) {
    setJobConfigString(json);
    const valid = isValidJson(json);
    setSaveable(valid);
  }

  function onDatafeedChange(json: string) {
    setDatafeedConfigString(json);
    let valid = isValidJson(json);
    if (valid) {
      // ensure that the user hasn't altered the indices list in the json.
      const { indices }: Datafeed = JSON.parse(json);
      const originalIndices = jobCreator.indices.sort();
      valid =
        originalIndices.length === indices.length &&
        originalIndices.every((value, index) => value === indices[index]);
    }
    setSaveable(valid);
  }

  function onSave() {
    const jobConfig = JSON.parse(jobConfigString);
    const datafeedConfig = JSON.parse(datafeedConfigString);
    jobCreator.cloneFromExistingJob(jobConfig, datafeedConfig);
    jobCreatorUpdate();
    setShowJsonFlyout(false);
  }

  return (
    <Fragment>
      <FlyoutButton
        onClick={toggleJsonFlyout}
        isDisabled={isDisabled}
        editJsonMode={editJsonMode}
      />

      {showJsonFlyout === true && isDisabled === false && (
        <EuiFlyout onClose={() => setShowJsonFlyout(false)} hideCloseButton size={flyOutSize}>
          <EuiFlyoutBody>
            <EuiFlexGroup>
              {jobEditorMode !== EDITOR_MODE.HIDDEN && (
                <Contents
                  editJson={jobEditorMode === EDITOR_MODE.EDITABLE}
                  onChange={onJobChange}
                  title={i18n.translate('xpack.ml.newJob.wizard.jsonFlyout.job.title', {
                    defaultMessage: 'Job configuration JSON',
                  })}
                  value={jobConfigString}
                />
              )}
              {datafeedEditorMode !== EDITOR_MODE.HIDDEN && (
                <Contents
                  editJson={datafeedEditorMode === EDITOR_MODE.EDITABLE}
                  onChange={onDatafeedChange}
                  title={i18n.translate('xpack.ml.newJob.wizard.jsonFlyout.datafeed.title', {
                    defaultMessage: 'Datafeed configuration JSON',
                  })}
                  value={datafeedConfigString}
                />
              )}
            </EuiFlexGroup>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={() => setShowJsonFlyout(false)}
                  flush="left"
                >
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.jsonFlyout.closeButton"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              {readOnlyMode === false && (
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={onSave} fill isDisabled={saveable === false}>
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.jsonFlyout.saveButton"
                      defaultMessage="Save"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </Fragment>
  );
};

const FlyoutButton: FC<{ isDisabled: boolean; onClick(): void; editJsonMode: boolean }> = ({
  isDisabled,
  onClick,
  editJsonMode,
}) => {
  const previewJsonTitle = i18n.translate('xpack.ml.newJob.wizard.previewJsonButton', {
    defaultMessage: 'Preview JSON',
  });
  const editJsonTitle = i18n.translate('xpack.ml.newJob.wizard.editJsonButton', {
    defaultMessage: 'Edit JSON',
  });
  return (
    <EuiButtonEmpty
      onClick={onClick}
      isDisabled={isDisabled}
      data-test-subj="mlJobWizardButtonPreviewJobJson"
    >
      {editJsonMode ? editJsonTitle : previewJsonTitle}
    </EuiButtonEmpty>
  );
};

const Contents: FC<{
  title: string;
  value: string;
  editJson: boolean;
  onChange(s: string): void;
}> = ({ title, value, editJson, onChange }) => {
  return (
    <EuiFlexItem>
      <EuiTitle size="s">
        <h5>{title}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <MLJobEditor
        value={value}
        height={EDITOR_HEIGHT}
        readOnly={editJson === false}
        onChange={onChange}
      />
    </EuiFlexItem>
  );
};
