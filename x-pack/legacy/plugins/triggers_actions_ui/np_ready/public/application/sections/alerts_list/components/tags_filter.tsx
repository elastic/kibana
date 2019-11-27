/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFilterGroup,
  EuiPopover,
  EuiFilterButton,
  EuiComboBox,
  EuiComboBoxOptionProps,
} from '@elastic/eui';

interface TagsFilterProps {
  onChange?: (selectedTags: string[]) => void;
}

export const TagsFilter: React.FunctionComponent<TagsFilterProps> = ({ onChange }) => {
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionProps[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  useEffect(() => {
    if (onChange) {
      onChange(selectedOptions.map(item => item.label));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptions]);

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            iconType="arrowDown"
            hasActiveFilters={selectedOptions.length > 0}
            numActiveFilters={selectedOptions.length}
            numFilters={selectedOptions.length}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.alertsList.tagsFilterLabel"
              defaultMessage="Tags"
            />
          </EuiFilterButton>
        }
      >
        <div style={{ width: '300px' }}>
          <EuiComboBox
            fullWidth
            noSuggestions
            selectedOptions={selectedOptions}
            onCreateOption={(searchValue: string) => {
              setSelectedOptions(selectedOptions.concat({ label: searchValue }));
            }}
            onChange={(updatedSelectedOptions: EuiComboBoxOptionProps[]) => {
              setSelectedOptions(updatedSelectedOptions);
            }}
          />
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
