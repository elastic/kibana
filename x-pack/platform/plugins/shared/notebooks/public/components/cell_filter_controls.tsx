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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
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
import { EMPTY_CELL_FILTER, type CellFilter } from '../model/cell_filter';
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

const SEARCH_LABEL = i18n.translate('xpack.notebook.cellFilter.search', {
  defaultMessage: 'Search cells',
});
const FILTER_LABEL = i18n.translate('xpack.notebook.cellFilter.open', {
  defaultMessage: 'Filter cells',
});
const TYPE_GROUP_LABEL = i18n.translate('xpack.notebook.cellFilter.typeGroup', {
  defaultMessage: 'Type',
});
const APP_GROUP_LABEL = i18n.translate('xpack.notebook.cellFilter.appGroup', {
  defaultMessage: 'App',
});
const NO_APP_LABEL = i18n.translate('xpack.notebook.cellFilter.noApp', {
  defaultMessage: 'Not in an app',
});
const CLEAR_LABEL = i18n.translate('xpack.notebook.cellFilter.clear', {
  defaultMessage: 'Clear filters',
});

type FilterChoice = { kind: 'type'; type: CellType } | { kind: 'app'; appId: string | null };

const toggle = <T,>(values: readonly T[], value: T): T[] =>
  values.includes(value) ? values.filter((current) => current !== value) : [...values, value];

const toggleChoice = (filter: CellFilter, choice: FilterChoice): Partial<CellFilter> =>
  choice.kind === 'type'
    ? { types: toggle(filter.types, choice.type) }
    : { appIds: toggle(filter.appIds, choice.appId) };

/** A floating icon button that opens a popover, with a badge while its filter is set. */
const FloatingPopoverButton = ({
  iconType,
  label,
  badge,
  dataTestSubj,
  children,
}: {
  iconType: string;
  label: string;
  badge?: number;
  dataTestSubj: string;
  children: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upRight"
      panelPaddingSize="none"
      aria-label={label}
      button={
        <div
          css={css`
            position: relative;
          `}
        >
          <EuiPanel hasShadow paddingSize="none" grow={false}>
            <EuiToolTip content={label} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType={iconType}
                color="text"
                size="m"
                aria-label={label}
                aria-pressed={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                data-test-subj={dataTestSubj}
              />
            </EuiToolTip>
          </EuiPanel>
          {badge !== undefined && badge > 0 && (
            <EuiNotificationBadge
              css={css`
                position: absolute;
                top: calc(${euiTheme.size.xs} * -1);
                right: calc(${euiTheme.size.xs} * -1);
                pointer-events: none;
              `}
            >
              {badge}
            </EuiNotificationBadge>
          )}
        </div>
      }
    >
      {children}
    </EuiPopover>
  );
};

const SearchPanel = () => {
  const { euiTheme } = useEuiTheme();
  const { cellFilter$ } = useNotebook();
  const { search } = useStateFromPublishingSubject(cellFilter$);

  return (
    <div
      css={css`
        width: 320px;
        padding: ${euiTheme.size.s};
      `}
    >
      <EuiFieldSearch
        compressed
        fullWidth
        autoFocus
        placeholder={SEARCH_LABEL}
        aria-label={SEARCH_LABEL}
        value={search}
        onChange={(event) =>
          cellFilter$.next({ ...cellFilter$.getValue(), search: event.target.value })
        }
        data-test-subj="notebookCellFilterSearch"
      />
    </div>
  );
};

const FilterPanel = () => {
  const { store, cellFilter$ } = useNotebook();
  const filter = useStateFromPublishingSubject(cellFilter$);
  const apps = useStateFromPublishingSubject(store.apps$);

  const choices: Array<{ choice: FilterChoice; label: string; prepend?: ReactNode }> = [
    ...FILTER_TYPES.map(({ type, label }) => ({
      choice: { kind: 'type' as const, type },
      label,
      prepend: <EuiIcon type={TYPE_ICONS[type]} aria-hidden={true} />,
    })),
    ...(apps.length > 0
      ? [
          { choice: { kind: 'app' as const, appId: null }, label: NO_APP_LABEL },
          ...apps.map(({ id, title }) => ({
            choice: { kind: 'app' as const, appId: id },
            label: title,
          })),
        ]
      : []),
  ];

  const isChecked = (choice: FilterChoice) =>
    choice.kind === 'type'
      ? filter.types.includes(choice.type)
      : filter.appIds.includes(choice.appId);

  const toOption = (
    { choice, label, prepend }: (typeof choices)[number],
    index: number
  ): EuiSelectableOption<{ index: number }> => ({
    index,
    label,
    prepend,
    checked: isChecked(choice) ? 'on' : undefined,
  });

  const typeOptions = choices.flatMap((entry, index) =>
    entry.choice.kind === 'type' ? [toOption(entry, index)] : []
  );
  const appOptions = choices.flatMap((entry, index) =>
    entry.choice.kind === 'app' ? [toOption(entry, index)] : []
  );
  const options: Array<EuiSelectableOption<{ index: number }>> = [
    { index: -1, label: TYPE_GROUP_LABEL, isGroupLabel: true },
    ...typeOptions,
    ...(appOptions.length > 0
      ? [{ index: -1, label: APP_GROUP_LABEL, isGroupLabel: true }, ...appOptions]
      : []),
  ];
  const isFiltered = filter.types.length + filter.appIds.length > 0;

  return (
    <div
      css={css`
        width: 260px;
      `}
    >
      <EuiPopoverTitle paddingSize="s">{FILTER_LABEL}</EuiPopoverTitle>
      <EuiSelectable
        aria-label={FILTER_LABEL}
        options={options}
        onChange={(_options, _event, changed) => {
          const entry = choices[changed.index];
          if (entry) cellFilter$.next({ ...filter, ...toggleChoice(filter, entry.choice) });
        }}
        listProps={{ bordered: false }}
        height="full"
      >
        {(list) => list}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">
        <EuiButtonEmpty
          size="xs"
          flush="left"
          isDisabled={!isFiltered}
          onClick={() => cellFilter$.next({ ...filter, types: [], appIds: [] })}
          data-test-subj="notebookCellFilterClear"
        >
          {CLEAR_LABEL}
        </EuiButtonEmpty>
      </EuiPopoverFooter>
    </div>
  );
};

/** Search and filter buttons floating at the bottom right of the notebook page. */
export const CellFilterControls = () => {
  const { euiTheme } = useEuiTheme();
  const { cellFilter$ } = useNotebook();
  const { search, types, appIds } = useStateFromPublishingSubject(cellFilter$);

  return (
    <div
      css={css`
        position: sticky;
        bottom: ${euiTheme.size.l};
        z-index: ${euiTheme.levels.header};
        height: 0;
      `}
    >
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        css={css`
          position: absolute;
          right: ${euiTheme.size.l};
          bottom: 0;
        `}
        data-test-subj="notebookCellFilterControls"
      >
        <EuiFlexItem grow={false}>
          <FloatingPopoverButton
            iconType="search"
            label={SEARCH_LABEL}
            badge={search.trim() ? 1 : 0}
            dataTestSubj="notebookCellSearchButton"
          >
            <SearchPanel />
          </FloatingPopoverButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FloatingPopoverButton
            iconType="filter"
            label={FILTER_LABEL}
            badge={types.length + appIds.length}
            dataTestSubj="notebookCellFilterButton"
          >
            <FilterPanel />
          </FloatingPopoverButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

/** How many cells the filter shows, above the filtered list. */
export const CellFilterSummary = ({ shown, total }: { shown: number; total: number }) => {
  const { cellFilter$ } = useNotebook();
  const clearButton = (
    <EuiButtonEmpty
      size="xs"
      onClick={() => cellFilter$.next(EMPTY_CELL_FILTER)}
      data-test-subj="notebookCellFilterSummaryClear"
    >
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
