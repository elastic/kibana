/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JobCreatorContext } from '../../../job_creator_context';
import { tabColor } from '../../../../../../../../common/util/group_color_utils';
import { Description } from './description';

export const GroupsInput: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const { existingJobsAndGroups } = useContext(JobCreatorContext);
  const [selectedGroups, setSelectedGroups] = useState(jobCreator.groups);

  useEffect(() => {
    jobCreator.groups = selectedGroups;
    jobCreatorUpdate();
  }, [selectedGroups.join()]);

  const options: EuiComboBoxOptionProps[] = existingJobsAndGroups.groups.map((g: string) => ({
    label: g,
    color: tabColor(g),
  }));

  const selectedOptions: EuiComboBoxOptionProps[] = selectedGroups.map((g: string) => ({
    label: g,
    color: tabColor(g),
  }));

  function onChange(optionsIn: EuiComboBoxOptionProps[]) {
    setSelectedGroups(optionsIn.map(g => g.label));
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

    setSelectedGroups([...selectedOptions, newGroup].map(g => g.label));
  }

  return (
    <Description>
      <EuiComboBox
        placeholder={i18n.translate('xpack.ml.newJob.wizard.jobGroupSelectPlaceholder', {
          defaultMessage: 'Select or create groups',
        })}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChange}
        onCreateOption={onCreateGroup}
        isClearable={true}
        // isInvalid={groupsValidationError !== ''}
        // error={groupsValidationError}
      />
    </Description>
  );
};
