/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ActiveTagFilters, TagKey } from './fake_entities';
import { TAG_KEYS, TAG_KEY_LABEL } from './fake_entities';

interface Props {
  readonly facets: Record<TagKey, string[]>;
  readonly activeFilters: ActiveTagFilters;
  readonly onChange: (next: ActiveTagFilters) => void;
}

const TagFilterPopover = ({
  tagKey,
  options,
  selected,
  onChange,
}: {
  tagKey: TagKey;
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: `entityCentricLabTagFilter-${tagKey}` });
  const label = TAG_KEY_LABEL[tagKey];

  const selectableOptions = useMemo<EuiSelectableOption[]>(
    () =>
      options.map((value) => ({
        key: value,
        label: value,
        checked: selected.includes(value) ? ('on' as const) : undefined,
      })),
    [options, selected]
  );

  return (
    <EuiPopover
      id={popoverId}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.tagFilter.popoverAriaLabel',
        {
          defaultMessage: 'Filter by {label}',
          values: { label: label.toLowerCase() },
        }
      )}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          isSelected={isOpen}
          numFilters={options.length}
          numActiveFilters={selected.length}
          hasActiveFilters={selected.length > 0}
          onClick={() => setIsOpen((prev) => !prev)}
          data-test-subj={`entityCentricLabTagFilterButton-${tagKey}`}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        searchable
        aria-label={i18n.translate(
          'xpack.streams.entityCentricLab.entities.tagFilter.selectableAriaLabel',
          {
            defaultMessage: 'Filter entities by {label}',
            values: { label: label.toLowerCase() },
          }
        )}
        options={selectableOptions}
        onChange={(next) => {
          onChange(
            next.filter((opt) => opt.checked === 'on').map((opt) => String(opt.key ?? opt.label))
          );
        }}
        emptyMessage={i18n.translate(
          'xpack.streams.entityCentricLab.entities.tagFilter.emptyValues',
          { defaultMessage: 'No values available' }
        )}
      >
        {(list, search) => (
          <EuiPanel
            hasShadow={false}
            hasBorder={false}
            paddingSize="none"
            css={css`
              min-width: 260px;
            `}
          >
            {search}
            {list}
          </EuiPanel>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const EntitiesTagFilters = ({ facets, activeFilters, onChange }: Props) => {
  const totalActive = useMemo(
    () => TAG_KEYS.reduce((sum, key) => sum + activeFilters[key].length, 0),
    [activeFilters]
  );

  const handleKeyChange = (key: TagKey) => (next: string[]) => {
    onChange({ ...activeFilters, [key]: next });
  };

  const clearAll = () => {
    onChange({ application: [], environment: [], team: [], region: [] });
  };

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      `}
      data-test-subj="entityCentricLabTagFilters"
    >
      <EuiFilterGroup
        aria-label={i18n.translate(
          'xpack.streams.entityCentricLab.entities.tagFilter.groupAriaLabel',
          { defaultMessage: 'Entity tag filters' }
        )}
      >
        <TagFilterPopover
          tagKey="application"
          options={facets.application}
          selected={activeFilters.application}
          onChange={handleKeyChange('application')}
        />
        <TagFilterPopover
          tagKey="environment"
          options={facets.environment}
          selected={activeFilters.environment}
          onChange={handleKeyChange('environment')}
        />
        <TagFilterPopover
          tagKey="team"
          options={facets.team}
          selected={activeFilters.team}
          onChange={handleKeyChange('team')}
        />
        <TagFilterPopover
          tagKey="region"
          options={facets.region}
          selected={activeFilters.region}
          onChange={handleKeyChange('region')}
        />
      </EuiFilterGroup>
      {totalActive > 0 ? (
        <EuiButtonEmpty
          size="s"
          iconType="cross"
          onClick={clearAll}
          data-test-subj="entityCentricLabTagFiltersClear"
        >
          {i18n.translate('xpack.streams.entityCentricLab.entities.tagFilter.clearAll', {
            defaultMessage: 'Clear filters',
          })}
        </EuiButtonEmpty>
      ) : null}
    </div>
  );
};
