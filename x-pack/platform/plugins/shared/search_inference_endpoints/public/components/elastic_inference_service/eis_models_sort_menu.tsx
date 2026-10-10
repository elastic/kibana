/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useContentListSort, type SortDirection } from '@kbn/content-list-provider';
import { EIS_NAME_SORT_FIELD, EIS_RELEASED_SORT_FIELD } from '../../utils/eis_content_list_utils';

interface EisSortOption {
  id: string;
  field: string;
  direction: SortDirection;
  label: string;
}

const SORT_OPTIONS: EisSortOption[] = [
  {
    id: 'nameAsc',
    field: EIS_NAME_SORT_FIELD,
    direction: 'asc',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.nameAsc', {
      defaultMessage: 'A → Z',
    }),
  },
  {
    id: 'nameDesc',
    field: EIS_NAME_SORT_FIELD,
    direction: 'desc',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.nameDesc', {
      defaultMessage: 'Z → A',
    }),
  },
  {
    id: 'releasedDesc',
    field: EIS_RELEASED_SORT_FIELD,
    direction: 'desc',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.releasedDesc', {
      defaultMessage: 'Newest',
    }),
  },
  {
    id: 'releasedAsc',
    field: EIS_RELEASED_SORT_FIELD,
    direction: 'asc',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.releasedAsc', {
      defaultMessage: 'Oldest',
    }),
  },
];

export const EisModelsSortMenu = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'eisModelsSortMenu' });
  const { field, direction, setSort } = useContentListSort();
  const selectedOption = SORT_OPTIONS.find(
    (option) => option.field === field && option.direction === direction
  );

  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiPopover
      id={popoverId}
      button={
        <EuiButtonEmpty
          size="xs"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
          data-test-subj="eisModelsSortMenuButton"
        >
          {selectedOption ? (
            <FormattedMessage
              id="xpack.searchInferenceEndpoints.eisModelsPage.sort.buttonLabel"
              defaultMessage="Sort by: {option}"
              values={{ option: selectedOption.label }}
            />
          ) : (
            <FormattedMessage
              id="xpack.searchInferenceEndpoints.eisModelsPage.sort.buttonLabelNoSelection"
              defaultMessage="Sort by"
            />
          )}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.ariaLabel', {
        defaultMessage: 'Sort options',
      })}
    >
      <EuiContextMenuPanel
        size="s"
        items={SORT_OPTIONS.map((option) => (
          <EuiContextMenuItem
            key={option.id}
            icon={option === selectedOption ? 'check' : 'empty'}
            onClick={() => {
              closePopover();
              setSort(option.field, option.direction);
            }}
            data-test-subj={`eisModelsSortOption-${option.id}`}
          >
            {option.label}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
