/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLoadingSpinner,
  EuiCheckbox,
} from '@elastic/eui';

export const Navigation = ({
  isSaving,
  hasNextStep,
  hasPreviousStep,
  goToNextStep,
  goToPreviousStep,
  save,
  canGoToNextStep,
  onClickToggleStart,
  startJobAfterCreation,
}) => {
  if (isSaving) {
    return (
      <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText>
            <FormattedMessage
              id="xpack.rollupJobs.create.navigation.savingText"
              defaultMessage="Saving"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const previousStepButton = (
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        iconType="arrowLeft"
        onClick={goToPreviousStep}
        data-test-subj="rollupJobBackButton"
      >
        <FormattedMessage id="xpack.rollupJobs.create.backButton.label" defaultMessage="Back" />
      </EuiButtonEmpty>
    </EuiFlexItem>
  );

  const nextStepButton = (
    <EuiFlexItem grow={false}>
      <EuiButton
        iconType="arrowRight"
        iconSide="right"
        onClick={goToNextStep}
        disabled={!canGoToNextStep}
        fill
        data-test-subj="rollupJobNextButton"
      >
        <FormattedMessage id="xpack.rollupJobs.create.nextButton.label" defaultMessage="Next" />
      </EuiButton>
    </EuiFlexItem>
  );

  const saveButton = (
    <EuiFlexItem grow={false}>
      <EuiButton
        color="success"
        iconType="check"
        onClick={save}
        fill
        data-test-subj="rollupJobSaveButton"
      >
        <FormattedMessage id="xpack.rollupJobs.create.saveButton.label" defaultMessage="Save" />
      </EuiButton>
    </EuiFlexItem>
  );

  const startAfterCreateCheckbox = (
    <EuiFlexItem grow={false} style={{ alignSelf: 'center' }}>
      <EuiCheckbox
        id="rollupJobToggleJobStartAfterCreation"
        data-test-subj="rollupJobToggleJobStartAfterCreation"
        checked={startJobAfterCreation}
        label={
          <FormattedMessage
            id="xpack.rollupJobs.create.startJobLabel"
            defaultMessage="Start job now"
          />
        }
        onChange={onClickToggleStart}
      />
    </EuiFlexItem>
  );

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
      {hasPreviousStep && previousStepButton}
      {hasNextStep && nextStepButton}
      {!hasNextStep && (
        <Fragment>
          {saveButton}
          {startAfterCreateCheckbox}
        </Fragment>
      )}
    </EuiFlexGroup>
  );
};

Navigation.propTypes = {
  hasNextStep: PropTypes.bool.isRequired,
  hasPreviousStep: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  goToNextStep: PropTypes.func,
  goToPreviousStep: PropTypes.func,
  save: PropTypes.func.isRequired,
  canGoToNextStep: PropTypes.bool.isRequired,
};
