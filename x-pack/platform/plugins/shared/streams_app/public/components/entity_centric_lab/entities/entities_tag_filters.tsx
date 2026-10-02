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
import { getVisibleTagKeys, TAG_KEY_LABEL } from './fake_entities';
import { labThingLabel, labThings } from '../lab_terminology';

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
  /** Render at the compact (32px) filter height to line up with the search bar. */
  readonly compressed?: boolean;
  /**
   * Hide the built-in "Clear filters" affordance. Set when the caller owns a
   * unified clear button that resets these plus other filters (ElasticOn).
   */
  readonly hideClear?: boolean;
  /**
   * ElasticOn hides Application (infra-first). Other modes keep Team /
   * Application. Environment and Region are always hidden from this row.
   */
  readonly isElasticOn?: boolean;
  /**
   * Phase 1 hides all tag-filter dropdowns (category-specific filters still
   * appear via their own controls). Takes priority over `isElasticOn`.
   */
  readonly isPhase1?: boolean;
}

const TagFilterPopover = ({
  tagKey,
  options,
  selected,
  onChange,
  isElasticOn,
}: {
  tagKey: TagKey;
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
  isElasticOn: boolean;
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
            defaultMessage: 'Filter {things} by {label}',
            values: { label: label.toLowerCase(), things: labThings(isElasticOn) },
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

export const EntitiesTagFilters = ({
  facets,
  activeFilters,
  onChange,
  compressed = false,
  hideClear = false,
  isElasticOn = false,
  isPhase1 = false,
}: Props) => {
  const visibleKeys = useMemo(
    () => getVisibleTagKeys(isElasticOn, isPhase1),
    [isElasticOn, isPhase1]
  );
  const totalActive = useMemo(
    () => visibleKeys.reduce((sum, key) => sum + activeFilters[key].length, 0),
    [activeFilters, visibleKeys]
  );

  const handleKeyChange = (key: TagKey) => (next: string[]) => {
    onChange({ ...activeFilters, [key]: next });
  };

  const clearAll = () => {
    onChange({ application: [], environment: [], team: [], region: [] });
  };

  if (visibleKeys.length === 0) {
    return null;
  }

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
          compressed={compressed}
          aria-label={i18n.translate(
            'xpack.streams.entityCentricLab.entities.tagFilter.groupAriaLabel',
            { defaultMessage: '{thing} tag filters', values: { thing: labThingLabel(isElasticOn) } }
          )}
        >
          {visibleKeys.map((tagKey) => (
            <TagFilterPopover
              key={tagKey}
              tagKey={tagKey}
              options={facets[tagKey]}
              selected={activeFilters[tagKey]}
              onChange={handleKeyChange(tagKey)}
              isElasticOn={isElasticOn}
            />
          ))}
        </EuiFilterGroup>
      </EuiFlexItem>
      {!hideClear && totalActive > 0 ? (
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
