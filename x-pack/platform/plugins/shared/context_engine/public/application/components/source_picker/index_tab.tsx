/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiComboBox,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import { useIndices } from '../../hooks/use_indices';

interface IndexTabProps {
  enabled: boolean;
  onAdd: (indexName: string) => void;
}

export const IndexTab = ({ enabled, onAdd }: IndexTabProps) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState('');

  const { indexNames, isLoading, isError } = useIndices({ search, enabled });

  const options = useMemo<EuiComboBoxOptionOption<string>[]>(
    () => indexNames.map((name) => ({ label: name, value: name })),
    [indexNames]
  );

  const selectedOptions = useMemo<EuiComboBoxOptionOption<string>[]>(
    () => (selectedIndex ? [{ label: selectedIndex, value: selectedIndex }] : []),
    [selectedIndex]
  );

  const handleSelectionChange = (nextSelectedOptions: EuiComboBoxOptionOption<string>[]) => {
    const nextIndex = nextSelectedOptions[0]?.value;
    setSelectedIndex(typeof nextIndex === 'string' ? nextIndex : '');
  };

  const handleAdd = () => {
    const trimmedIndex = selectedIndex.trim();
    if (!trimmedIndex) {
      return;
    }
    onAdd(trimmedIndex);
    setSelectedIndex('');
    setSearch('');
  };

  if (isError) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        data-test-subj="contextIndexTabError"
        title={
          <h3>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.index.errorTitle"
              defaultMessage="Unable to load indices"
            />
          </h3>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.index.errorBody"
              defaultMessage="Indices and data streams could not be loaded. Try again or check your permissions."
            />
          </p>
        }
      />
    );
  }

  return (
    <div data-test-subj="contextIndexTab">
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.contextEngine.sourcePicker.index.fieldLabel"
            defaultMessage="Index or data stream"
          />
        }
      >
        <EuiComboBox
          async
          fullWidth
          singleSelection={{ asPlainText: true }}
          aria-label={i18n.translate('xpack.contextEngine.sourcePicker.index.comboAriaLabel', {
            defaultMessage: 'Select an index or data stream',
          })}
          placeholder={i18n.translate('xpack.contextEngine.sourcePicker.index.comboPlaceholder', {
            defaultMessage: 'Search indices and data streams',
          })}
          options={options}
          selectedOptions={selectedOptions}
          onChange={handleSelectionChange}
          onSearchChange={setSearch}
          isLoading={isLoading}
          data-test-subj="contextIndexComboBox"
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plusCircle"
            onClick={handleAdd}
            isDisabled={!selectedIndex.trim()}
            data-test-subj="contextAddIndexSourceButton"
          >
            <FormattedMessage
              id="xpack.contextEngine.sourcePicker.index.addButton"
              defaultMessage="Add index source"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
