/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

export interface MergeFieldOption {
  key: string;
  label: string;
  caseRefs: string;
}

interface MergeFieldRowProps {
  label: string;
  value: React.ReactNode;
  provenance: string;
  hasConflict: boolean;
  options?: MergeFieldOption[];
  selectedKey?: string;
  onSelectOption?: (key: string) => void;
  popoverTitle?: string;
  renderPopoverActions?: (closePopover: () => void) => React.ReactNode;
  editor?: React.ReactNode;
  isEditing: boolean;
  onToggleEdit: () => void;
  isDisabled: boolean;
  helpText?: React.ReactNode;
  'data-test-subj': string;
}

export const MergeFieldRow = React.memo<MergeFieldRowProps>(
  ({
    label,
    value,
    provenance,
    hasConflict,
    options = [],
    selectedKey,
    onSelectOption,
    popoverTitle,
    renderPopoverActions,
    editor,
    isEditing,
    onToggleEdit,
    isDisabled,
    helpText,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const closePopover = useCallback(() => setIsPopoverOpen(false), []);

    const selectableOptions = useMemo<EuiSelectableOption[]>(
      () =>
        options.map(({ key, label: optionLabel, caseRefs }) => ({
          key,
          label: optionLabel,
          checked: key === selectedKey ? 'on' : undefined,
          append: (
            <EuiText size="xs" color="subdued">
              {caseRefs}
            </EuiText>
          ),
          'data-test-subj': `${dataTestSubj}-option`,
        })),
      [dataTestSubj, options, selectedKey]
    );

    const onSelectableChange = useCallback(
      (newOptions: EuiSelectableOption[]) => {
        const selected = newOptions.find(({ checked }) => checked === 'on');
        if (selected?.key != null) {
          onSelectOption?.(selected.key);
        }
        closePopover();
      },
      [closePopover, onSelectOption]
    );

    return (
      <EuiPanel
        paddingSize="s"
        hasShadow={false}
        color={hasConflict ? 'subdued' : 'transparent'}
        data-test-subj={dataTestSubj}
      >
        <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
          <EuiFlexItem
            grow={false}
            css={css`
              width: calc(${euiTheme.size.xxxxl} * 2);
            `}
          >
            <EuiText size="s">
              <strong>{label}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              min-width: 0;
            `}
          >
            <EuiText size="s" data-test-subj={`${dataTestSubj}-value`}>
              {value}
            </EuiText>
            <EuiText size="xs" color="subdued" data-test-subj={`${dataTestSubj}-provenance`}>
              {provenance}
            </EuiText>
            {helpText}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              {hasConflict ? (
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    isOpen={isPopoverOpen}
                    closePopover={closePopover}
                    panelPaddingSize="none"
                    anchorPosition="downRight"
                    aria-label={popoverTitle ?? label}
                    button={
                      <EuiButtonEmpty
                        size="xs"
                        color="warning"
                        iconType="warning"
                        isDisabled={isDisabled}
                        onClick={() => setIsPopoverOpen((open) => !open)}
                        aria-label={i18n.CONFLICT_ARIA_LABEL(label, options.length)}
                        data-test-subj={`${dataTestSubj}-conflict-trigger`}
                      >
                        {i18n.CONFLICT_TRIGGER(options.length)}
                      </EuiButtonEmpty>
                    }
                  >
                    {popoverTitle != null ? (
                      <EuiPopoverTitle paddingSize="s">{popoverTitle}</EuiPopoverTitle>
                    ) : null}
                    <EuiSelectable
                      singleSelection="always"
                      options={selectableOptions}
                      onChange={onSelectableChange}
                      listProps={{ bordered: false, showIcons: true }}
                      css={css`
                        width: calc(${euiTheme.size.xxxxl} * 7);
                      `}
                      data-test-subj={`${dataTestSubj}-selectable`}
                    >
                      {(list) => list}
                    </EuiSelectable>
                    {renderPopoverActions != null ? (
                      <EuiPopoverFooter paddingSize="s">
                        {renderPopoverActions(closePopover)}
                      </EuiPopoverFooter>
                    ) : null}
                  </EuiPopover>
                </EuiFlexItem>
              ) : null}
              {editor != null ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    isDisabled={isDisabled}
                    onClick={onToggleEdit}
                    aria-label={i18n.EDIT_FIELD_ARIA_LABEL(label)}
                    data-test-subj={`${dataTestSubj}-edit`}
                  >
                    {isEditing ? i18n.DONE : i18n.EDIT}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isEditing && editor != null ? (
          <>
            <EuiSpacer size="s" />
            {editor}
          </>
        ) : null}
      </EuiPanel>
    );
  }
);
MergeFieldRow.displayName = 'MergeFieldRow';
