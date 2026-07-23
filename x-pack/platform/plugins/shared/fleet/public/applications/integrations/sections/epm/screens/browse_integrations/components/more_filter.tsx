/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import { EuiFilterButton, EuiPopover, EuiSelectable, type EuiSelectableOption } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export interface MoreFilterValues {
  hideDeprecated: boolean;
  hideContentPacks: boolean;
}

export const MoreFilter: React.FC<
  MoreFilterValues & {
    onChange: (values: MoreFilterValues) => void;
  }
> = ({ hideDeprecated, hideContentPacks, onChange }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const options: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.moreHideDeprecatedOption',
          { defaultMessage: 'Hide deprecated integrations' }
        ),
        key: 'hideDeprecated',
        checked: hideDeprecated ? 'on' : undefined,
        'data-test-subj': 'browseIntegrations.searchBar.moreHideDeprecatedOption',
      },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.moreHideContentPacksOption',
          { defaultMessage: 'Hide content packs' }
        ),
        key: 'hideContentPacks',
        checked: hideContentPacks ? 'on' : undefined,
        'data-test-subj': 'browseIntegrations.searchBar.moreHideContentPacksOption',
      },
    ],
    [hideDeprecated, hideContentPacks]
  );

  const activeCount = (hideDeprecated ? 1 : 0) + (hideContentPacks ? 1 : 0);

  const onSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const isChecked = (key: string) =>
        newOptions.find((option) => option.key === key)?.checked === 'on';

      onChange({
        hideDeprecated: isChecked('hideDeprecated'),
        hideContentPacks: isChecked('hideContentPacks'),
      });
    },
    [onChange]
  );

  return (
    <EuiPopover
      id="browseIntegrationsMorePopover"
      aria-label={i18n.translate(
        'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.morePopoverAriaLabel',
        { defaultMessage: 'More options' }
      )}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      button={
        <EuiFilterButton
          data-test-subj="browseIntegrations.searchBar.moreBtn"
          iconType="arrowDown"
          onClick={togglePopover}
          isSelected={isOpen}
          numFilters={activeCount}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount}
        >
          <FormattedMessage
            id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.moreLabel"
            defaultMessage="More"
          />
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        data-test-subj="browseIntegrations.searchBar.moreSelectableList"
        searchable={false}
        options={options}
        onChange={onSelectionChange}
        listProps={{
          showIcons: true,
          style: { minWidth: 250 },
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
