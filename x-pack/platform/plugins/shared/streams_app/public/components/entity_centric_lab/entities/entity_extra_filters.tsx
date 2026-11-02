/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiHorizontalRule,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ActiveExtraFilters, ExtraFilterDef } from './fake_entities';

// See `entities_tag_filters.tsx` for the rationale — pin flex-grow to 0 so the
// filter row doesn't absorb the space the grid gives up.
const NO_GROW = css`
  flex-grow: 0;
`;

interface Props {
  /** Extra-filter definitions for the currently scoped category. */
  readonly defs: readonly ExtraFilterDef[];
  /** Values present for each def key (from `getExtraFacets`). */
  readonly facets: Record<string, string[]>;
  readonly activeFilters: ActiveExtraFilters;
  readonly onChange: (next: ActiveExtraFilters) => void;
  /** Render at the compact (32px) filter height to line up with the search bar. */
  readonly compressed?: boolean;
}

const ExtraFilterPopover = ({
  def,
  options,
  selected,
  onChange,
}: {
  def: ExtraFilterDef;
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: `entityCentricLabExtraFilter-${def.key}` });

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
          data-test-subj={`entityCentricLabExtraFilterButton-${def.key}`}
        >
          {def.label}
        </EuiFilterButton>
      }
    >
      {def.help ? (
        <>
          <EuiText size="xs" color="subdued" css={{ padding: 8 }}>
            <p>{def.help}</p>
          </EuiText>
          <EuiHorizontalRule margin="none" />
        </>
      ) : null}
      <EuiSelectable
        searchable
        aria-label={i18n.translate(
          'xpack.streams.entityCentricLab.entities.extraFilter.selectableAriaLabel',
          {
            defaultMessage: 'Filter entities by {label}',
            values: { label: def.label.toLowerCase() },
          }
        )}
        options={selectableOptions}
        onChange={(next) => {
          onChange(
            next.filter((opt) => opt.checked === 'on').map((opt) => String(opt.key ?? opt.label))
          );
        }}
        emptyMessage={i18n.translate(
          'xpack.streams.entityCentricLab.entities.extraFilter.emptyValues',
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

/**
 * Entity-type-specific filters (e.g. Hosts → Operating system / Cloud provider
 * / Service name) rendered to the right of the shared tag filters. Driven
 * entirely by {@link ExtraFilterDef}s so a new category's facets only need a
 * config entry + seeded attributes (see `fake_entities.ts`).
 */
export const EntityExtraFilters = ({
  defs,
  facets,
  activeFilters,
  onChange,
  compressed = false,
}: Props) => {
  if (defs.length === 0) return null;

  return (
    <EuiFilterGroup
      compressed={compressed}
      css={NO_GROW}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.extraFilter.groupAriaLabel',
        { defaultMessage: 'Entity type filters' }
      )}
      data-test-subj="entityCentricLabExtraFilters"
    >
      {defs.map((def) => (
        <ExtraFilterPopover
          key={def.key}
          def={def}
          options={facets[def.key] ?? []}
          selected={activeFilters[def.key] ?? []}
          onChange={(next) => onChange({ ...activeFilters, [def.key]: next })}
        />
      ))}
    </EuiFilterGroup>
  );
};
