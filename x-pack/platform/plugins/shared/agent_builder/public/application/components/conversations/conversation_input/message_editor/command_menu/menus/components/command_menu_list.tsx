/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';
import {
  EuiSelectable,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
  keys,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CommandMenuHandle } from '../../types';

const MENU_WIDTH = 280;
const MENU_MAX_HEIGHT = 240;
// EuiSelectable rows are 32px high by default
const MENU_ROW_HEIGHT = 32;

const loadingLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.list.loading',
  { defaultMessage: 'Loading...' }
);

const noMatchesLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.list.noMatches',
  { defaultMessage: 'No matching results' }
);

export interface CommandMenuListOption {
  readonly key: string;
  /**
   * Plain string for accessibility and default label; use `renderLabel` for rich rows.
   */
  readonly label: string;
  readonly renderLabel?: React.ReactNode;
}

/** After EuiSelectableList merges `option.data` into the option, `renderOption` receives this shape. */
type CommandMenuListSelectableRow = EuiSelectableOption &
  Partial<Pick<CommandMenuListOption, 'renderLabel'>>;

interface CommandMenuListProps {
  readonly options: readonly CommandMenuListOption[];
  readonly isLoading: boolean;
  readonly onSelect: (option: CommandMenuListOption) => void;
  readonly width?: number;
  readonly 'data-test-subj'?: string;
  /** When true, Space also selects the highlighted option, like Enter. */
  readonly spaceSelection?: boolean;
  /** Rows shown before the list scrolls. Defaults to a fixed height of 240px. */
  readonly maxVisibleRows?: number;
  /** When true, the highlighted row shows an Enter key hint. */
  readonly showEnterHint?: boolean;
}

export const CommandMenuList = forwardRef<CommandMenuHandle, CommandMenuListProps>(
  (
    {
      options,
      isLoading,
      onSelect,
      width: menuWidth = MENU_WIDTH,
      'data-test-subj': dataTestSubj = 'commandMenuList',
      spaceSelection,
      maxVisibleRows,
      showEnterHint,
    },
    ref
  ) => {
    const { euiTheme } = useEuiTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const activeIndexRef = useRef(activeIndex);
    activeIndexRef.current = activeIndex;

    const containerRef = useRef<HTMLDivElement>(null);

    const optionKeysSignature = useMemo(
      () => options.map((option) => option.key).join('|'),
      [options]
    );
    useEffect(() => {
      setActiveIndex(0);
    }, [optionKeysSignature]);

    const scrollIndexIntoView = (index: number) => {
      const items = containerRef.current?.querySelectorAll('.euiSelectableListItem');
      const item = items?.[index];
      item?.scrollIntoView?.({ block: 'nearest' });
    };
    const handleSetActive = (next: (index: number) => number) => {
      const nextIndex = next(activeIndexRef.current);
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      scrollIndexIntoView(nextIndex);
    };
    const handleSelectOption = () => {
      const option = options[activeIndexRef.current];
      if (option) {
        onSelect(option);
      }
    };

    const selectableOptions: EuiSelectableOption[] = useMemo(
      () =>
        options.map((option) => ({
          label: option.label,
          key: option.key,
          data: option.renderLabel != null ? { renderLabel: option.renderLabel } : undefined,
        })),
      [options]
    );

    useImperativeHandle(ref, () => ({
      isKeyDownEventHandled: (event: React.KeyboardEvent): boolean => {
        const handledKeys = [
          keys.ARROW_DOWN,
          keys.ARROW_UP,
          // Ctrl+n and Ctrl+p
          ...(event.ctrlKey ? ['n', 'p'] : []),
          keys.ENTER,
          keys.TAB,
        ];
        // Always claim Space, even with zero options: results can lag a
        // keystroke behind, and a leaked space would type as plain text.
        if (event.key === keys.SPACE && spaceSelection) {
          return true;
        }
        return handledKeys.includes(event.key);
      },
      handleKeyDown: (event: React.KeyboardEvent): void => {
        if (event.key === keys.ARROW_DOWN || (event.ctrlKey && event.key === 'n')) {
          handleSetActive((prev) => Math.min(prev + 1, options.length - 1));
        } else if (event.key === keys.ARROW_UP || (event.ctrlKey && event.key === 'p')) {
          handleSetActive((prev) => Math.max(prev - 1, 0));
        } else if (event.key === keys.ENTER || event.key === keys.TAB) {
          handleSelectOption();
        } else if (event.key === keys.SPACE && spaceSelection) {
          handleSelectOption();
        }
      },
    }));

    const containerStyles = css`
      width: ${menuWidth}px;
    `;

    const maxHeight = maxVisibleRows ? maxVisibleRows * MENU_ROW_HEIGHT : MENU_MAX_HEIGHT;
    const activeKey = options[activeIndex]?.key;

    const rowStyles = css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: ${euiTheme.size.s};
    `;

    const activeHighlightStyles = css`
      .euiSelectableListItem:nth-child(${activeIndex + 1}) {
        background-color: ${euiTheme.focus.backgroundColor};
      }
    `;

    if (isLoading) {
      return (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          css={css`
            width: ${menuWidth}px;
            padding: ${euiTheme.size.m};
          `}
          data-test-subj={`${dataTestSubj}-loading`}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" aria-label={loadingLabel} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <div
        ref={containerRef}
        css={[containerStyles, activeHighlightStyles]}
        data-test-subj={dataTestSubj}
        onMouseDown={(e) => {
          // Prevent mousedown from blurring the editor, which would dismiss the menu before the click fires
          e.preventDefault();
        }}
      >
        <EuiSelectable
          options={selectableOptions}
          singleSelection
          renderOption={(option: CommandMenuListSelectableRow) => {
            const label = option.renderLabel ?? option.label;
            if (!showEnterHint) {
              return label;
            }
            return (
              <span css={rowStyles}>
                {label}
                {option.key === activeKey && (
                  <EuiIcon type="return" size="s" color="subdued" aria-hidden={true} />
                )}
              </span>
            );
          }}
          listProps={{
            showIcons: false,
            bordered: false,
            css: css`
              max-height: ${maxHeight}px;
            `,
          }}
          onChange={(_newOptions, _event, changedOption) => {
            if (changedOption) {
              const matchingOption = options.find((o) => o.key === changedOption.key);
              if (matchingOption) {
                onSelect(matchingOption);
              }
            }
          }}
          emptyMessage={noMatchesLabel}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    );
  }
);
