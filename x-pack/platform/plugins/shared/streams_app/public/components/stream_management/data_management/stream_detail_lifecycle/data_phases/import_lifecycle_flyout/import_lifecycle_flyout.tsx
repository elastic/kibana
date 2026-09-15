/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiPopover,
  EuiSelectable,
} from '@elastic/eui';
import {
  FlyoutFooterWithRetentionWarning,
  RetentionSelector,
  RetentionSelectorSearch,
} from '@kbn/data-lifecycle-phases';
import { LifecycleFlyout } from '../../common/lifecycle_flyout';
import { IMPORT_METHOD_DLM, IMPORT_METHOD_ILM } from './constants';
import { importLifecycleFlyoutI18n } from './i18n';
import type { ImportLifecycleFlyoutProps } from './types';
import type { ImportLifecycleMethod } from './constants';

const importMethodFilterOptions: Array<{ key: ImportLifecycleMethod; label: string }> = [
  { key: IMPORT_METHOD_DLM, label: importLifecycleFlyoutI18n.methodFilterDlm },
  { key: IMPORT_METHOD_ILM, label: importLifecycleFlyoutI18n.methodFilterIlm },
];

interface ImportLifecycleMethodFilterProps {
  selectedMethods: ImportLifecycleMethod[];
  onChangeSelectedMethods: (methods: ImportLifecycleMethod[]) => void;
  isDisabled: boolean;
}

const ImportLifecycleMethodFilter = ({
  selectedMethods,
  onChangeSelectedMethods,
  isDisabled,
}: ImportLifecycleMethodFilterProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const selectedMethodCount = selectedMethods.length;

  return (
    <EuiFilterGroup compressed>
      <EuiPopover
        aria-label={importLifecycleFlyoutI18n.methodFilterPopoverAriaLabel}
        isOpen={isDisabled ? false : isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="s"
        button={
          <EuiFilterButton
            iconType="chevronSingleDown"
            isSelected={isPopoverOpen}
            onClick={() => setIsPopoverOpen((open) => !open)}
            isDisabled={isDisabled}
            hasActiveFilters={selectedMethodCount > 0}
            numActiveFilters={selectedMethodCount > 0 ? selectedMethodCount : undefined}
            data-test-subj="streamsImportLifecycleMethodFilterButton"
          >
            {importLifecycleFlyoutI18n.methodFilterButtonLabel}
          </EuiFilterButton>
        }
      >
        <EuiSelectable
          aria-label={importLifecycleFlyoutI18n.methodFilterSelectableAriaLabel}
          options={importMethodFilterOptions.map(({ key, label }) => ({
            key,
            label,
            checked: selectedMethods.includes(key) ? 'on' : undefined,
          }))}
          listProps={{ isVirtualized: false, textWrap: 'wrap' }}
          onChange={(newOptions) => {
            const nextSelectedMethods = importMethodFilterOptions.reduce<ImportLifecycleMethod[]>(
              (methods, methodOption) => {
                const option = newOptions.find(({ key }) => key === methodOption.key);
                return option?.checked === 'on' ? [...methods, methodOption.key] : methods;
              },
              []
            );

            onChangeSelectedMethods(nextSelectedMethods);
          }}
        >
          {(list) => <>{list}</>}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

export const ImportLifecycleFlyout = ({
  titleId,
  options,
  selectedOptionName,
  onSelectOption,
  onInspect,
  isLoadingStreams,
  selectedMethods,
  onChangeSelectedMethods,
  onApply,
  onClose,
  isApplyDisabled,
  canUseDownsampling = true,
  'data-test-subj': dataTestSubj = 'streamsImportLifecycleFlyout',
}: ImportLifecycleFlyoutProps) => {
  const [searchValue, setSearchValue] = useState('');
  // Gives the option list a precise scroll height down to the flyout bottom.
  const flyoutScrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (selectedMethods.length === 0) return options;
    return options.filter(({ method }) => selectedMethods.includes(method));
  }, [options, selectedMethods]);
  const selectedOption = options.find(({ name }) => name === selectedOptionName);
  const showDownsamplingWarning = !canUseDownsampling && Boolean(selectedOption?.hasDownsampling);
  const downsamplingWarningType =
    selectedOption?.method === IMPORT_METHOD_ILM ? 'ilm_policy' : 'import_stream';

  return (
    <LifecycleFlyout
      onClose={onClose}
      ownFocus={false}
      paddingSize="none"
      data-test-subj={dataTestSubj}
      titleId={titleId}
      title={importLifecycleFlyoutI18n.title}
      headerContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <RetentionSelectorSearch
              searchValue={searchValue}
              onSearchValueChange={setSearchValue}
              isDisabled={isLoadingStreams}
              searchPlaceholder={importLifecycleFlyoutI18n.searchPlaceholder}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ImportLifecycleMethodFilter
              selectedMethods={selectedMethods}
              onChangeSelectedMethods={onChangeSelectedMethods}
              isDisabled={isLoadingStreams}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiFlyoutBody scrollContainerRef={flyoutScrollContainerRef}>
        <RetentionSelector
          options={filteredOptions}
          selectedOptionName={selectedOptionName}
          onSelectOption={onSelectOption}
          onInspect={onInspect}
          isDisabled={isLoadingStreams}
          height="full"
          inspectPlacement="badge"
          showSearch={false}
          searchValue={searchValue}
          flyoutScrollContainerRef={flyoutScrollContainerRef}
          searchPlaceholder={importLifecycleFlyoutI18n.searchPlaceholder}
          inspectButtonLabel={importLifecycleFlyoutI18n.inspectButtonLabel}
        />
      </EuiFlyoutBody>

      <FlyoutFooterWithRetentionWarning
        onCancel={onClose}
        onApply={onApply}
        isApplyDisabled={isApplyDisabled}
        showWarning={showDownsamplingWarning}
        warningType={downsamplingWarningType}
      />
    </LifecycleFlyout>
  );
};
