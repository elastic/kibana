/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CreateDataViewForm } from '@kbn/ml-data-view-utils/components/create_data_view_form_row';

import type { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { Messages } from '../shared';
import { ANALYTICS_STEPS } from '../../page';
import { useCanCreateDataView } from '../../hooks/use_can_create_data_view';
import { useDataViewTimeFields } from '../../hooks/use_data_view_time_fields';
import { CreateStepFooter } from '../create_step_footer';

interface Props extends CreateAnalyticsFormProps {
  step: ANALYTICS_STEPS;
  showCreateDataView?: boolean;
}

export const CreateStep: FC<Props> = ({ actions, state, step, showCreateDataView = false }) => {
  const canCreateDataView = useCanCreateDataView();
  const { dataViewAvailableTimeFields, onTimeFieldChanged } = useDataViewTimeFields({
    actions,
    state,
  });

  const { createAnalyticsJob, setFormState, startAnalyticsJob } = actions;
  const { isAdvancedEditorValidJson, isJobCreated, isJobStarted, isValid, requestMessages } = state;
  const { createDataView, destinationDataViewTitleExists, jobId, jobType, timeFieldName } =
    state.form;

  const [startChecked, setStartChecked] = useState<boolean>(true);
  const [creationTriggered, setCreationTriggered] = useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);

  if (step !== ANALYTICS_STEPS.CREATE) return null;

  const handleCreation = async () => {
    setCreationTriggered(true);
    const creationSuccess = await createAnalyticsJob();

    if (creationSuccess === false) {
      setCreationTriggered(false);
    }

    if (startChecked && creationSuccess === true) {
      setShowProgress(true);
      startAnalyticsJob();
    }
  };

  return (
    <div data-test-subj="mlAnalyticsCreateJobWizardCreateStep active">
      {!isJobCreated && !isJobStarted && (
        <>
          {showCreateDataView && (
            <>
              <CreateDataViewForm
                canCreateDataView={canCreateDataView}
                createDataView={createDataView}
                dataViewTitleExists={destinationDataViewTitleExists}
                setCreateDataView={() => setFormState({ createDataView: !createDataView })}
                dataViewAvailableTimeFields={dataViewAvailableTimeFields}
                dataViewTimeField={timeFieldName}
                onTimeFieldChanged={onTimeFieldChanged}
              />
              <EuiSpacer />
            </>
          )}

          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFormRow
                helpText={i18n.translate(
                  'xpack.ml.dataframe.analytics.create.startCheckboxHelpText',
                  {
                    defaultMessage:
                      'If unselected, job can be started later by returning to the jobs list.',
                  }
                )}
              >
                <EuiSwitch
                  data-test-subj="mlAnalyticsCreateJobWizardStartJobSwitch"
                  name="mlAnalyticsCreateJobWizardStartJobSwitch"
                  label={i18n.translate('xpack.ml.dataframe.analytics.create.wizardStartCheckbox', {
                    defaultMessage: 'Start immediately',
                  })}
                  checked={startChecked}
                  onChange={(e) => {
                    setStartChecked(e.target.checked);
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                className="mlAnalyticsCreateWizard__footerButton"
                disabled={!isValid || !isAdvancedEditorValidJson}
                onClick={handleCreation}
                fill
                isLoading={creationTriggered}
                data-test-subj="mlAnalyticsCreateJobWizardCreateButton"
              >
                {i18n.translate('xpack.ml.dataframe.analytics.create.wizardCreateButton', {
                  defaultMessage: 'Create',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      <EuiSpacer size="s" />
      <Messages messages={requestMessages} />
      {isJobCreated === true ? (
        <CreateStepFooter jobId={jobId} jobType={jobType!} showProgress={showProgress} />
      ) : null}
    </div>
  );
};
