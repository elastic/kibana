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
  useEuiTheme,
  keys,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CommandMenuHandle } from '../../types';

const MENU_WIDTH = 280;
const MENU_MAX_HEIGHT = 240;

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
  readonly label: string;
}

interface CommandMenuListProps {
  readonly options: readonly CommandMenuListOption[];
  readonly isLoading: boolean;
  readonly onSelect: (option: CommandMenuListOption) => void;
  readonly renderExtraContent?: (key: string) => React.ReactNode;
  readonly width?: number;
  readonly 'data-test-subj'?: string;
}

export const CommandMenuList = forwardRef<CommandMenuHandle, CommandMenuListProps>(
  (
    {
      options,
      isLoading,
      onSelect,
      renderExtraContent,
      width: menuWidth = MENU_WIDTH,
      'data-test-subj': dataTestSubj = 'commandMenuList',
    },
    ref
  ) => {
    const { euiTheme } = useEuiTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const activeIndexRef = useRef(activeIndex);
    activeIndexRef.current = activeIndex;

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setActiveIndex(0);
    }, [options.length]);

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
        return handledKeys.includes(event.key);
      },
      handleKeyDown: (event: React.KeyboardEvent): void => {
        if (event.key === keys.ARROW_DOWN || (event.ctrlKey && event.key === 'n')) {
          handleSetActive((prev) => Math.min(prev + 1, options.length - 1));
        } else if (event.key === keys.ARROW_UP || (event.ctrlKey && event.key === 'p')) {
          handleSetActive((prev) => Math.max(prev - 1, 0));
        } else if (event.key === keys.ENTER || event.key === keys.TAB) {
          handleSelectOption();
        }
      },
    }));

    const optionRowStyles = css`
      display: flex;
      align-items: baseline;
      gap: ${euiTheme.size.s};
      min-width: 0;
    `;

    const renderOption = renderExtraContent
      ? (option: EuiSelectableOption) => {
          const extraContent = renderExtraContent(option.key ?? '');
          return (
            <span css={optionRowStyles}>
              <span>{option.label}</span>
              {extraContent}
            </span>
          );
        }
      : undefined;

    const containerStyles = css`
      width: ${menuWidth}px;
    `;

    const activeHighlightStyles = css`
      .euiSelectableListItem:nth-child(${activeIndex + 1}) {
        background-color: ${euiTheme.colors.backgroundLightPrimary};
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
          renderOption={renderOption}
          listProps={{
            showIcons: false,
            bordered: false,
            css: css`
              max-height: ${MENU_MAX_HEIGHT}px;
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
