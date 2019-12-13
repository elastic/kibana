/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';
import { Validation } from '../job_validator';
import { tabColor } from '../../../../../../common/util/group_color_utils';
import { Description } from '../../pages/components/job_details_step/components/groups/description';

export interface JobGroupsInputProps {
  existingGroups: string[];
  selectedGroups: string[];
  onChange: (value: string[]) => void;
  validation: Validation;
}

export const JobGroupsInput: FC<JobGroupsInputProps> = memo(
  ({ existingGroups, selectedGroups, onChange, validation }) => {
    const options = existingGroups.map<EuiComboBoxOptionProps>(g => ({
      label: g,
      color: tabColor(g),
    }));

    const selectedOptions = selectedGroups.map<EuiComboBoxOptionProps>(g => ({
      label: g,
      color: tabColor(g),
    }));

    function onChangeCallback(optionsIn: EuiComboBoxOptionProps[]) {
      onChange(optionsIn.map(g => g.label));
    }

    function onCreateGroup(input: string, flattenedOptions: EuiComboBoxOptionProps[]) {
      const normalizedSearchValue = input.trim().toLowerCase();

      if (!normalizedSearchValue) {
        return;
      }

      const newGroup: EuiComboBoxOptionProps = {
        label: input,
        color: tabColor(input),
      };

      if (
        flattenedOptions.findIndex(
          option => option.label.trim().toLowerCase() === normalizedSearchValue
        ) === -1
      ) {
        options.push(newGroup);
      }

      onChangeCallback([...selectedOptions, newGroup]);
    }

    return (
      <Description validation={validation}>
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.ml.newJob.wizard.jobDetailsStep.jobGroupSelect.placeholder',
            {
              defaultMessage: 'Select or create groups',
            }
          )}
          options={options}
          selectedOptions={selectedOptions}
          onChange={onChangeCallback}
          onCreateOption={onCreateGroup}
          isClearable={true}
          isInvalid={!validation.valid}
          data-test-subj="mlJobWizardComboBoxJobGroups"
        />
      </Description>
    );
  }
);
