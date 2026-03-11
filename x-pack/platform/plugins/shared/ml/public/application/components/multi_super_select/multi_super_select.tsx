/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiFormControlLayoutProps, EuiSelectableOption } from '@elastic/eui';
import { EuiButtonEmpty, EuiFormControlLayout, EuiInputPopover, EuiSelectable } from '@elastic/eui';
import { useMultiSuperSelectStyles } from './use_multi_super_select_styles';

interface MultiSuperSelect<T> {
  prepend: EuiFormControlLayoutProps['prepend'];
  inputDisplay: React.JSX.Element | string;
  options: Array<EuiSelectableOption<T>>;
  onOptionsChange?: (options: Array<EuiSelectableOption<T>>) => void;
}

export const MultiSuperSelect = <T = string,>({
  prepend,
  inputDisplay,
  options,
  onOptionsChange,
}: MultiSuperSelect<T>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const styles = useMultiSuperSelectStyles(isPopoverOpen);

  const closePopover = () => setIsPopoverOpen(false);

  const onPopoverButtonClick = () => setIsPopoverOpen((prev) => !prev);

  const popoverButton = (
    <EuiFormControlLayout isDropdown prepend={prepend} compressed fullWidth>
      <EuiButtonEmpty onClick={onPopoverButtonClick} css={styles.control}>
        {inputDisplay}
      </EuiButtonEmpty>
    </EuiFormControlLayout>
  );

  // Handle changes to the options
  const handleOptionsChange = (newOptions: Array<EuiSelectableOption<T>>) => {
    if (onOptionsChange) {
      onOptionsChange(newOptions);
    }
  };

  return (
    <EuiInputPopover input={popoverButton} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiSelectable
        options={options}
        onChange={handleOptionsChange}
        listProps={{
          showIcons: true,
        }}
      >
        {(list) => <>{list}</>}
      </EuiSelectable>
    </EuiInputPopover>
  );
};
