/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type ReactNode } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiSelectableOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellType } from '../../common/types';
import { EMPTY_CELL_FILTER, countActiveFilters, type CellFilter } from '../model/cell_filter';
import { TYPE_ICONS } from './cell_display';
import { useNotebook } from './notebook_context';

const FILTER_TYPES: ReadonlyArray<{ type: CellType; label: string }> = [
  {
    type: 'esql',
    label: i18n.translate('xpack.notebook.cellFilter.type.esql', { defaultMessage: 'ES|QL' }),
  },
  {
    type: 'chart',
    label: i18n.translate('xpack.notebook.cellFilter.type.chart', { defaultMessage: 'Chart' }),
  },
  {
    type: 'custom',
    label: i18n.translate('xpack.notebook.cellFilter.type.custom', { defaultMessage: 'Custom' }),
  },
  {
    type: 'markdown',
    label: i18n.translate('xpack.notebook.cellFilter.type.markdown', {
      defaultMessage: 'Markdown',
    }),
  },
  {
    type: 'input',
    label: i18n.translate('xpack.notebook.cellFilter.type.input', { defaultMessage: 'Input' }),
  },
];

const FILTER_LABEL = i18n.translate('xpack.notebook.cellFilter.open', {
  defaultMessage: 'Filter cells',
});
const COLLAPSE_LABEL = i18n.translate('xpack.notebook.cellFilter.collapse', {
  defaultMessage: 'Hide filters',
});
const SEARCH_LABEL = i18n.translate('xpack.notebook.cellFilter.search', {
  defaultMessage: 'Search cells',
});
const TYPE_LABEL = i18n.translate('xpack.notebook.cellFilter.typeButton', {
  defaultMessage: 'Type',
});
const APP_LABEL = i18n.translate('xpack.notebook.cellFilter.appButton', {
  defaultMessage: 'App',
});
const NO_APP_LABEL = i18n.translate('xpack.notebook.cellFilter.noApp', {
  defaultMessage: 'Not in an app',
});
const CLEAR_LABEL = i18n.translate('xpack.notebook.cellFilter.clear', {
  defaultMessage: 'Clear filters',
});

const toggle = <T,>(values: readonly T[], value: T): T[] =>
  values.includes(value) ? values.filter((current) => current !== value) : [...values, value];

const FilterPopover = <T,>({
  label,
  options,
  selected,
  onToggle,
  dataTestSubj,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string; prepend?: ReactNode }>;
  selected: readonly T[];
  onToggle: (value: T) => void;
  dataTestSubj: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectableOptions: Array<EuiSelectableOption<{ index: number }>> = options.map(
    (option, index) => ({
      index,
      label: option.label,
      prepend: option.prepend,
      checked: selected.includes(option.value) ? 'on' : undefined,
    })
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upCenter"
      aria-label={label}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length}
          numFilters={options.length}
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        aria-label={label}
        options={selectableOptions}
        onChange={(_options, _event, changed) => onToggle(options[changed.index].value)}
        listProps={{ bordered: false }}
      >
        {(list) => (
          <div
            css={css`
              width: 220px;
            `}
          >
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

/** A filter control floating at the bottom right of the notebook, collapsed to a button until used. */
export const CellFilterBar = () => {
  const { euiTheme } = useEuiTheme();
  const { store, cellFilter$ } = useNotebook();
  const filter = useStateFromPublishingSubject(cellFilter$);
  const apps = useStateFromPublishingSubject(store.apps$);
  const [isExpanded, setIsExpanded] = useState(false);
  const activeCount = countActiveFilters(filter);

  const update = (change: Partial<CellFilter>) =>
    cellFilter$.next({ ...cellFilter$.getValue(), ...change });

  const appOptions = [
    { value: null, label: NO_APP_LABEL },
    ...apps.map(({ id, title }) => ({ value: id, label: title })),
  ];

  return (
    <div
      css={css`
        position: sticky;
        bottom: ${euiTheme.size.l};
        z-index: ${euiTheme.levels.header};
        height: 0;
      `}
    >
      <EuiPanel
        hasShadow
        paddingSize="xs"
        css={css`
          position: absolute;
          right: 0;
          bottom: 0;
        `}
        data-test-subj="notebookCellFilterBar"
      >
        {isExpanded ? (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFieldSearch
                compressed
                autoFocus
                placeholder={SEARCH_LABEL}
                aria-label={SEARCH_LABEL}
                value={filter.search}
                onChange={(event) => update({ search: event.target.value })}
                data-test-subj="notebookCellFilterSearch"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup compressed>
                <FilterPopover
                  label={TYPE_LABEL}
                  options={FILTER_TYPES.map(({ type, label }) => ({
                    value: type,
                    label,
                    prepend: <EuiIcon type={TYPE_ICONS[type]} aria-hidden={true} />,
                  }))}
                  selected={filter.types}
                  onToggle={(type) => update({ types: toggle(filter.types, type) })}
                  dataTestSubj="notebookCellFilterType"
                />
                {apps.length > 0 && (
                  <FilterPopover
                    label={APP_LABEL}
                    options={appOptions}
                    selected={filter.appIds}
                    onToggle={(appId) => update({ appIds: toggle(filter.appIds, appId) })}
                    dataTestSubj="notebookCellFilterApp"
                  />
                )}
              </EuiFilterGroup>
            </EuiFlexItem>
            {activeCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={CLEAR_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="eraser"
                    aria-label={CLEAR_LABEL}
                    onClick={() => cellFilter$.next(EMPTY_CELL_FILTER)}
                    data-test-subj="notebookCellFilterClear"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiToolTip content={COLLAPSE_LABEL} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="chevronSingleRight"
                  aria-label={COLLAPSE_LABEL}
                  onClick={() => setIsExpanded(false)}
                  data-test-subj="notebookCellFilterCollapse"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiButtonEmpty
            size="s"
            iconType="filter"
            onClick={() => setIsExpanded(true)}
            data-test-subj="notebookCellFilterOpen"
          >
            {FILTER_LABEL}
            {activeCount > 0 && (
              <>
                {' '}
                <EuiNotificationBadge>{activeCount}</EuiNotificationBadge>
              </>
            )}
          </EuiButtonEmpty>
        )}
      </EuiPanel>
    </div>
  );
};

/** How many cells the filter shows, above the filtered list. */
export const CellFilterSummary = ({
  shown,
  total,
  onClear,
}: {
  shown: number;
  total: number;
  onClear: () => void;
}) => {
  const clearButton = (
    <EuiButtonEmpty size="xs" onClick={onClear} data-test-subj="notebookCellFilterSummaryClear">
      {CLEAR_LABEL}
    </EuiButtonEmpty>
  );

  if (shown === 0) {
    return (
      <EuiEmptyPrompt
        iconType="filter"
        titleSize="xs"
        title={
          <h3>
            <FormattedMessage
              id="xpack.notebook.cellFilter.noMatches"
              defaultMessage="No cells match the filters"
            />
          </h3>
        }
        actions={clearButton}
        data-test-subj="notebookCellFilterNoMatches"
      />
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" data-test-subj="notebookCellFilterSummary">
          <FormattedMessage
            id="xpack.notebook.cellFilter.summary"
            defaultMessage="Showing {shown} of {total} {total, plural, one {cell} other {cells}}"
            values={{ shown, total }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{clearButton}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
