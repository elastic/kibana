/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBox, EuiFormRow, type EuiComboBoxOptionOption } from '@elastic/eui';
import { UNKNOWN_SPACE } from '@kbn/spaces-plugin/common';
import { useAccessibleSpaces } from '../../hooks/use_spaces';
import * as i18n from './translations';

interface DatasetSpacesPickerProps {
  value: string[];
  onChange: (spaceIds: string[]) => void;
  isDisabled?: boolean;
  error?: string;
}

/** Picks the spaces a dataset belongs to. Hidden when there is only one. */
export const DatasetSpacesPicker: React.FC<DatasetSpacesPickerProps> = ({
  value,
  onChange,
  isDisabled,
  error,
}) => {
  const { isEnabled, isLoading, activeSpaceId, spaces } = useAccessibleSpaces();

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      spaces.map((space) => ({
        value: space.id,
        label: space.id === activeSpaceId ? i18n.getCurrentSpaceOption(space.name) : space.name,
      })),
    [spaces, activeSpaceId]
  );

  if (!isEnabled) {
    return null;
  }

  // Hidden spaces arrive as placeholders with nothing to pick. Holding them out
  // of the combo box and re-attaching them on change keeps them assigned, and
  // keeps the count of them right.
  const hiddenSpaceIds = value.filter((spaceId) => spaceId === UNKNOWN_SPACE);
  const selectedIds = value.filter((spaceId) => spaceId !== UNKNOWN_SPACE);
  const selectedOptions = selectedIds.map(
    (spaceId) =>
      options.find((option) => option.value === spaceId) ?? { value: spaceId, label: spaceId }
  );

  const onSelectionChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    const nextSpaceIds = selected.map((option) => option.value as string);

    onChange([...nextSpaceIds, ...hiddenSpaceIds]);
  };

  return (
    <EuiFormRow
      label={i18n.SPACES_LABEL}
      helpText={
        hiddenSpaceIds.length > 0
          ? i18n.getHiddenSpacesHelpText(hiddenSpaceIds.length)
          : i18n.SPACES_HELP_TEXT
      }
      isInvalid={Boolean(error)}
      error={error}
      fullWidth
    >
      <EuiComboBox<string>
        fullWidth
        isLoading={isLoading}
        isDisabled={isDisabled}
        isInvalid={Boolean(error)}
        placeholder={i18n.SPACES_PLACEHOLDER}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onSelectionChange}
        data-test-subj="datasetSpacesPicker"
      />
    </EuiFormRow>
  );
};
