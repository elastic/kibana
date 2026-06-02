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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ActiveTagFilters, TagKey } from './fake_entities';
import { TAG_KEYS, TAG_KEY_LABEL } from './fake_entities';

// The Streams page body is a column flex container with `height: 100%`.
// `EuiFlexGroup` bakes `flex-grow: 1` directly into its CSS with no prop to
// disable it, so without this override the filter toolbar absorbs whatever
// vertical space the entities grid below gives up — exactly matching the
// "each new filter adds more space" symptom users hit when filtering shrinks
// the grid. Pinning `flex-grow` to `0` keeps the toolbar flush against the
// next row regardless of how many entities remain.
const NO_GROW = css`
  flex-grow: 0;
`;

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
      panelStyle={{ minWidth: 260 }}
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
          <>
            {search}
            {list}
          </>
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
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      wrap
      css={NO_GROW}
      data-test-subj="entityCentricLabTagFilters"
    >
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>
      {totalActive > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType="cross"
            onClick={clearAll}
            data-test-subj="entityCentricLabTagFiltersClear"
          >
            {i18n.translate('xpack.streams.entityCentricLab.entities.tagFilter.clearAll', {
              defaultMessage: 'Clear filters',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
