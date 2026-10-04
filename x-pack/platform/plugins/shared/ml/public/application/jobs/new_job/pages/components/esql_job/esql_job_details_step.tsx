/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JOB_ID_MAX_LENGTH } from '@kbn/ml-validators';
import { isJobIdValid, createDatafeedId } from '../../../../../../../common/util/job_utils';
import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import { useEsqlWizardContext } from './esql_wizard_context';
import { areGroupsValid } from './esql_step_gating';

/**
 * Step 3 of the staged ES|QL wizard (LEAD DECISION 2026-09-29, g2sz.10): job
 * ID, description, and groups — a dedicated step to match the other AD
 * wizards' JOB_DETAILS step, rather than bundling job ID entry into the
 * final create action the way the original flat page did.
 */
export const EsqlJobDetailsStep = () => {
  const mlApi = useMlApi();
  const { state, setJobId, setJobDescription, setJobGroups } = useEsqlWizardContext();
  const jobIdInvalid =
    state.jobId !== '' && (!isJobIdValid(state.jobId) || state.jobId.length > JOB_ID_MAX_LENGTH);
  const datafeedId = createDatafeedId(state.jobId);

  // Suggest existing groups, mirroring the classic wizard's GroupsInput
  // (job_details_step/components/groups/groups_input.tsx), which reads
  // existingJobsAndGroups from JobCreatorContext. The ES|QL wizard has no
  // equivalent context, so fetch once here via the same ML API.
  const [existingGroupIds, setExistingGroupIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    mlApi.jobs
      .getAllJobAndGroupIds()
      .then(({ groupIds }) => {
        if (isMounted) {
          setExistingGroupIds(groupIds);
        }
      })
      .catch(() => {
        // Suggestions are a convenience; leave the combo box create-only on failure.
      });

    return () => {
      isMounted = false;
    };
  }, [mlApi]);

  const suggestedGroupOptions: EuiComboBoxOptionOption[] = existingGroupIds
    .filter((group) => !state.jobGroups.includes(group))
    .map((group) => ({ label: group }));

  const selectedGroupOptions: EuiComboBoxOptionOption[] = state.jobGroups.map((group) => ({
    label: group,
  }));

  const groupOptions: EuiComboBoxOptionOption[] = [
    ...selectedGroupOptions,
    ...suggestedGroupOptions,
  ];

  const invalidGroups = state.jobGroups.filter((group) => !isJobIdValid(group));

  const onCreateGroup = (input: string) => {
    const trimmed = input.trim();

    if (trimmed === '' || state.jobGroups.includes(trimmed)) return;

    setJobGroups([...state.jobGroups, trimmed]);
  };

  return (
    <EuiForm>
      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.jobDetails.jobIdLabel', {
          defaultMessage: 'Job ID',
        })}
        isInvalid={jobIdInvalid}
        error={i18n.translate('xpack.ml.esqlJob.jobDetails.invalidJobId', {
          defaultMessage:
            'Use lowercase letters, numbers, hyphens, and underscores; begin and end with a letter or number.',
        })}
        fullWidth
      >
        <EuiFieldText
          aria-label={i18n.translate('xpack.ml.esqlJob.jobDetails.jobIdLabel', {
            defaultMessage: 'Job ID',
          })}
          value={state.jobId}
          onChange={(event) => setJobId(event.target.value)}
          maxLength={JOB_ID_MAX_LENGTH}
          isInvalid={jobIdInvalid}
          data-test-subj="mlEsqlJobId"
          fullWidth
        />
      </EuiFormRow>
      <EuiText size="s" color="subdued">
        <p data-test-subj="mlEsqlDatafeedId">
          {i18n.translate('xpack.ml.esqlJob.jobDetails.datafeedId', {
            defaultMessage: 'Datafeed ID: {datafeedId}',
            values: { datafeedId },
          })}
        </p>
      </EuiText>

      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.jobDetails.descriptionLabel', {
          defaultMessage: 'Job description',
        })}
        fullWidth
      >
        <EuiFieldText
          aria-label={i18n.translate('xpack.ml.esqlJob.jobDetails.descriptionLabel', {
            defaultMessage: 'Job description',
          })}
          value={state.jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          data-test-subj="mlEsqlJobDescription"
          fullWidth
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.ml.esqlJob.jobDetails.groupsLabel', {
          defaultMessage: 'Groups',
        })}
        isInvalid={!areGroupsValid(state.jobGroups)}
        error={i18n.translate('xpack.ml.esqlJob.jobDetails.invalidGroups', {
          defaultMessage:
            'Invalid group name(s): {groups}. Use lowercase letters, numbers, hyphens, and underscores.',
          values: { groups: invalidGroups.join(', ') },
        })}
        fullWidth
      >
        <EuiComboBox
          aria-label={i18n.translate('xpack.ml.esqlJob.jobDetails.groupsLabel', {
            defaultMessage: 'Groups',
          })}
          placeholder={i18n.translate('xpack.ml.esqlJob.jobDetails.groupsPlaceholder', {
            defaultMessage: 'Select or create groups',
          })}
          options={groupOptions}
          selectedOptions={selectedGroupOptions}
          onChange={(options) => setJobGroups(options.map(({ label }) => label))}
          onCreateOption={onCreateGroup}
          isClearable
          isInvalid={!areGroupsValid(state.jobGroups)}
          data-test-subj="mlEsqlJobGroups"
          fullWidth
        />
      </EuiFormRow>
    </EuiForm>
  );
};
