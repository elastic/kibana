/**
 * SelectServicesSection — bundle member picker, Step 0 "Schema & Services".
 *
 * Figma 3194-91716: flat 2-column card grid.
 * Each card: checkbox | icon + title + signal badges | description below.
 * Selected state: blue border + blue-tinted background.
 * Toolbar appears when items are selected: "↑ Sort fields | N | N items selected ↓"
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFieldSearch,
  EuiIcon,
  EuiSelect,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { StepSection, StepSectionHeader, StepSectionHeading } from './step_primitives';

import type { BundleService } from './aws_services';
// Re-exported for components that still import BundleService from here
export type { BundleService } from './aws_services';

type SortMode = 'popular' | 'category';
// Signal filter removed 09-15 — toolbar simplified to search + sort only

// ─── Single card ──────────────────────────────────────────────────────────────

const ServiceCard = ({
  service,
  isSelected,
  onToggle,
}: {
  service: BundleService;
  isSelected: boolean;
  onToggle: () => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onToggle()}
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.s} ${euiTheme.size.s}; /* 8px vertical — matches Step 2 card row height (09-15) */
        /* 09-15 late: subdued resting border (her call) — was the #D6DDEA midpoint */
        border: 1px solid ${isSelected ? euiTheme.colors.borderBasePrimary : euiTheme.colors.borderBaseSubdued};
        border-radius: ${euiTheme.border.radius.small};
        background: ${isSelected ? euiTheme.colors.backgroundBasePrimary : euiTheme.colors.backgroundBasePlain};
        cursor: pointer;
        transition:
          border-color ${euiTheme.animation.fast} ease,
          background ${euiTheme.animation.fast} ease;
        user-select: none;
        &:hover {
          border-color: ${euiTheme.colors.borderBasePrimary};
        }
      `}
    >
      {/* Checkbox — pointer-events: none so card onClick handles the toggle */}
      <div
        onClick={(e) => e.stopPropagation()}
        css={css`flex-shrink: 0; pointer-events: none;`}
      >
        <EuiCheckbox
          id={`svc-${service.id}`}
          checked={isSelected}
          onChange={onToggle}
          aria-label={service.title}
        />
      </div>

      {/* Icon — the workbench serves branded per-service SVGs (service.iconSrc);
          in this reference port we fall back to the EUI AWS logo. Production
          should use EPR package icons via PackageIcon. */}
      <EuiIcon type="logoAWS" size="m" css={css`flex-shrink: 0;`} />

      {/* Title */}
      <span
        css={css`
          flex: 1 1 0;
          min-width: 0;
          font-size: 13px;
          font-weight: ${isSelected ? euiTheme.font.weight.medium : euiTheme.font.weight.regular};
          color: ${euiTheme.colors.textParagraph};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 20px;
        `}
      >
        {service.title}
      </span>

      {/* Signal badges */}
      <span
        css={css`
          display: inline-flex;
          gap: 4px;
          flex-shrink: 0;
          & > .euiBadge + .euiBadge { margin-inline-start: 0; }
        `}
      >
        {service.signals.map((sig) => (
          <EuiBadge key={sig} color="hollow" css={css`font-size: 11px; padding-inline: 4px;`}>
            {sig}
          </EuiBadge>
        ))}
      </span>

      {/* description hidden — user call 09-14 */}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export interface SelectServicesSectionProps {
  bundleTitle: string;
  services: ReadonlyArray<BundleService>;
  selected: ReadonlyArray<string>;
  onSelectionChange: (ids: ReadonlyArray<string>) => void;
}

export const SelectServicesSection = ({
  bundleTitle,
  services,
  selected,
  onSelectionChange,
}: SelectServicesSectionProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('popular');

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleService = (id: string): void => {
    onSelectionChange(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const clearAll = (): void => onSelectionChange([]);

  const filteredServices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = services.filter(
      (s) =>
        needle === '' || s.title.toLowerCase().includes(needle) || (s.description ?? '').toLowerCase().includes(needle)
    );
    if (sortMode === 'category') {
      list = [...list].sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));
    }
    return list;
  }, [services, query, sortMode]);

  // Select all currently VISIBLE services (respects an active search filter),
  // merged with whatever is already selected (09-15 user request).
  const selectAll = (): void => {
    const merged = new Set(selected);
    for (const s of filteredServices) merged.add(s.id);
    onSelectionChange([...merged]);
  };
  const allVisibleSelected = filteredServices.every((s) => selectedSet.has(s.id));

  const selectedCount = selected.length;

  return (
    <StepSection>
      <StepSectionHeader>
        <StepSectionHeading>Which {bundleTitle} services do you want to monitor?</StepSectionHeading>
        {/* description removed 09-15 — redundant, heading is self-explanatory */}
      </StepSectionHeader>

      {/* Controls row: search + sort only (signal filter removed 09-15) */}
      <div
        css={css`
          display: grid;
          grid-template-columns: 1fr 138px;
          gap: ${euiTheme.size.s};
          width: 100%;
          align-items: center;
        `}
      >
        <EuiFieldSearch
          compressed
          fullWidth
          placeholder={`Search ${bundleTitle} integrations…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search services"
          css={css`
            & input {
              border-color: ${euiTheme.colors.borderBaseSubdued};
            }
            & input:hover:not(:focus) {
              border-color: ${euiTheme.colors.borderBasePlain};
            }
            & input::placeholder,
            & input::-webkit-input-placeholder { font-weight: 400; color: ${euiTheme.colors.textSubdued}; }
          `}
        />
        <EuiSelect
          compressed
          options={[
            { value: 'popular', text: 'Sort: Popular' },
            { value: 'category', text: 'Sort: Category' },
          ]}
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
        />
      </div>

      {/* Selection strip — always visible; shows context in both states so layout never jumps. */}
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
          font-size: 12px;
          padding: 2px 0;
          min-height: 20px;
        `}
      >
        <span
          css={css`
            font-size: 12px;
            font-weight: ${euiTheme.font.weight.regular};
            color: ${selectedCount === 0 ? euiTheme.colors.textSubdued : euiTheme.colors.textParagraph};
          `}
        >
          {selectedCount === 0 ? 'None selected' : `${selectedCount} selected`}
        </span>

        {/* Select all — always offered unless every visible service is already in (09-15) */}
        {!allVisibleSelected && (
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={selectAll}
            css={css`font-size: 12px; height: auto; padding-inline: 0;`}
          >
            · Select all
          </EuiButtonEmpty>
        )}

        {selectedCount > 0 && (
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={clearAll}
            css={css`font-size: 12px; height: auto; padding-inline: 0;`}
          >
            · Clear all
          </EuiButtonEmpty>
        )}
      </div>

      {/* Flat 2-column card grid */}
      {filteredServices.length === 0 ? (
        <div
          css={css`
            padding: ${euiTheme.size.base} 0;
            font-size: 14px;
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          No services match "{query.trim()}".
        </div>
      ) : (
        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: ${euiTheme.size.m}; /* 12px — matches catalogue tile grid (09-15) */

            @media (max-width: 640px) {
              grid-template-columns: 1fr;
            }
          `}
        >
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={selectedSet.has(service.id)}
              onToggle={() => toggleService(service.id)}
            />
          ))}
        </div>
      )}
    </StepSection>
  );
};
