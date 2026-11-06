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
  EuiCheckbox,
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
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { CellType } from '../../common/types';
import { EMPTY_CELL_FILTER, getActiveHiddenAppIds } from '../model/cell_filter';
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
    type: 'code',
    label: i18n.translate('xpack.notebook.cellFilter.type.code', {
      defaultMessage: 'JavaScript',
    }),
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
  defaultMessage: 'All types',
});
const APP_GROUP_LABEL = i18n.translate('xpack.notebook.cellFilter.appGroup', {
  defaultMessage: 'All apps',
});
const NO_APP_LABEL = i18n.translate('xpack.notebook.cellFilter.noApp', {
  defaultMessage: 'Not in an app',
});
const CLEAR_LABEL = i18n.translate('xpack.notebook.cellFilter.clear', {
  defaultMessage: 'Clear filters',
});
const SHOW_ALL_LABEL = i18n.translate('xpack.notebook.cellFilter.showAll', {
  defaultMessage: 'Show all',
});

const toggle = <T,>(values: readonly T[], value: T): T[] =>
  values.includes(value) ? values.filter((current) => current !== value) : [...values, value];

/** A raised icon button for the notebook's floating controls. */
export const FloatingIconButton = ({
  iconType,
  label,
  tooltip = label,
  onClick,
  isDisabled,
  isPressed,
  isPrimary,
  dataTestSubj,
}: {
  iconType: string;
  label: string;
  tooltip?: string;
  onClick: () => void;
  isDisabled?: boolean;
  isPressed?: boolean;
  /** Filled primary, like the header's run and refresh buttons. */
  isPrimary?: boolean;
  dataTestSubj: string;
}) => (
  <EuiPanel hasShadow paddingSize="none" grow={false}>
    <EuiToolTip content={tooltip} position="left" disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={iconType}
        color={isPrimary ? 'primary' : 'text'}
        display={isPrimary ? 'fill' : 'empty'}
        size="m"
        aria-label={label}
        aria-pressed={isPressed}
        isDisabled={isDisabled}
        onClick={onClick}
        data-test-subj={dataTestSubj}
      />
    </EuiToolTip>
  </EuiPanel>
);

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
  badge: number;
  dataTestSubj: string;
  children: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="leftUp"
      panelPaddingSize="none"
      aria-label={label}
      button={
        <div
          css={css`
            position: relative;
          `}
        >
          <FloatingIconButton
            iconType={iconType}
            label={label}
            isPressed={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            dataTestSubj={dataTestSubj}
          />
          {badge > 0 && (
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

interface CheckboxItem<T> {
  value: T;
  label: string;
  icon?: string;
}

/** A group checkbox that checks or clears all its items, which are listed indented below it. */
const CheckboxGroup = <T,>({
  label,
  items,
  hidden,
  onChange,
  dataTestSubj,
}: {
  label: string;
  items: ReadonlyArray<CheckboxItem<T>>;
  hidden: readonly T[];
  onChange: (hidden: T[]) => void;
  dataTestSubj: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const groupId = useGeneratedHtmlId({ prefix: dataTestSubj });
  const hiddenCount = items.filter(({ value }) => hidden.includes(value)).length;
  const values = items.map(({ value }) => value);

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiCheckbox
        id={groupId}
        label={<strong>{label}</strong>}
        checked={hiddenCount === 0}
        indeterminate={hiddenCount > 0 && hiddenCount < items.length}
        onChange={() => onChange(hiddenCount === 0 ? values : [])}
      />
      <div
        css={css`
          padding-left: ${euiTheme.size.l};
        `}
      >
        {items.map(({ value, label: itemLabel, icon }, index) => (
          <EuiCheckbox
            key={`${groupId}-${index}`}
            id={`${groupId}-${index}`}
            label={
              icon ? (
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={icon} size="s" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>{itemLabel}</EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                itemLabel
              )
            }
            checked={!hidden.includes(value)}
            onChange={() => onChange(toggle(hidden, value))}
          />
        ))}
      </div>
    </div>
  );
};

const FilterPanel = () => {
  const { euiTheme } = useEuiTheme();
  const { store, cellFilter$ } = useNotebook();
  const filter = useStateFromPublishingSubject(cellFilter$);
  const apps = useStateFromPublishingSubject(store.apps$);
  const hiddenAppIds = getActiveHiddenAppIds(filter, apps);
  const isFiltered = filter.hiddenTypes.length + hiddenAppIds.length > 0;

  return (
    <div
      css={css`
        width: 240px;
      `}
    >
      <EuiPopoverTitle paddingSize="s">{FILTER_LABEL}</EuiPopoverTitle>
      <EuiFlexGroup
        direction="column"
        gutterSize="m"
        css={css`
          padding: ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem>
          <CheckboxGroup
            label={TYPE_GROUP_LABEL}
            items={FILTER_TYPES.map(({ type, label }) => ({
              value: type,
              label,
              icon: TYPE_ICONS[type],
            }))}
            hidden={filter.hiddenTypes}
            onChange={(hiddenTypes) => cellFilter$.next({ ...filter, hiddenTypes })}
            dataTestSubj="notebookCellFilterTypes"
          />
        </EuiFlexItem>
        {apps.length > 0 && (
          <EuiFlexItem>
            <CheckboxGroup<string | null>
              label={APP_GROUP_LABEL}
              items={[
                ...apps.map(({ id, title }) => ({ value: id, label: title })),
                { value: null, label: NO_APP_LABEL },
              ]}
              hidden={hiddenAppIds}
              onChange={(next) => cellFilter$.next({ ...filter, hiddenAppIds: next })}
              dataTestSubj="notebookCellFilterApps"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiPopoverFooter paddingSize="s">
        <EuiButtonEmpty
          size="xs"
          flush="left"
          isDisabled={!isFiltered}
          onClick={() => cellFilter$.next({ ...filter, hiddenTypes: [], hiddenAppIds: [] })}
          data-test-subj="notebookCellFilterShowAll"
        >
          {SHOW_ALL_LABEL}
        </EuiButtonEmpty>
      </EuiPopoverFooter>
    </div>
  );
};

/** Search and filter buttons stacked at the bottom right of the notebook page. */
export const CellFilterControls = () => {
  const { euiTheme } = useEuiTheme();
  const { store, cellFilter$ } = useNotebook();
  const filter = useStateFromPublishingSubject(cellFilter$);
  const apps = useStateFromPublishingSubject(store.apps$);

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
        direction="column"
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
            badge={filter.search.trim() ? 1 : 0}
            dataTestSubj="notebookCellSearchButton"
          >
            <SearchPanel />
          </FloatingPopoverButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FloatingPopoverButton
            iconType="filter"
            label={FILTER_LABEL}
            badge={filter.hiddenTypes.length + getActiveHiddenAppIds(filter, apps).length}
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
