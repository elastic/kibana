/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useToggle from 'react-use/lib/useToggle';
import { i18n } from '@kbn/i18n';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiText,
  type PopoverAnchorPosition,
  useEuiTheme,
} from '@elastic/eui';
import { useIlmPhasesColorAndDescription } from '../../hooks/use_ilm_phases_color_and_description';

const OPTIONS = ['hot', 'warm', 'cold', 'frozen', 'delete'] as const;

export type IlmPhaseSelectOption = (typeof OPTIONS)[number];

export interface IlmPhaseSelectRenderButtonProps {
  disabled: boolean;
  onClick: React.MouseEventHandler;
  'data-test-subj': string;
  'aria-label': string;
}

export interface IlmPhaseSelectProps {
  renderButton: (props: IlmPhaseSelectRenderButtonProps) => React.ReactElement;
  selectedPhases: IlmPhaseSelectOption[];
  onSelect: (phase: IlmPhaseSelectOption) => void;
  excludedPhases?: IlmPhaseSelectOption[];
  disabled?: boolean;
  initialIsOpen?: boolean;
  anchorPosition?: PopoverAnchorPosition;
  'data-test-subj'?: string;
}

const PHASE_LABELS: Record<IlmPhaseSelectOption, string> = {
  hot: i18n.translate('xpack.streams.ilmPhaseSelect.hotPhaseLabel', {
    defaultMessage: 'Hot phase',
  }),
  warm: i18n.translate('xpack.streams.ilmPhaseSelect.warmPhaseLabel', {
    defaultMessage: 'Warm phase',
  }),
  cold: i18n.translate('xpack.streams.ilmPhaseSelect.coldPhaseLabel', {
    defaultMessage: 'Cold phase',
  }),
  frozen: i18n.translate('xpack.streams.ilmPhaseSelect.frozenPhaseLabel', {
    defaultMessage: 'Frozen phase',
  }),
  delete: i18n.translate('xpack.streams.ilmPhaseSelect.deletePhaseLabel', {
    defaultMessage: 'Delete phase',
  }),
};

export const IlmPhaseSelect = ({
  renderButton,
  selectedPhases,
  onSelect,
  excludedPhases = [],
  disabled = false,
  initialIsOpen = false,
  anchorPosition = 'downCenter',
  'data-test-subj': dataTestSubj = 'ilmPhaseSelect',
}: IlmPhaseSelectProps) => {
  const [isOpen, togglePopover] = useToggle(initialIsOpen);

  const { euiTheme } = useEuiTheme();
  const { ilmPhases } = useIlmPhasesColorAndDescription();

  const availableOptions = useMemo(
    () =>
      OPTIONS.filter(
        (option) => !selectedPhases.includes(option) && !excludedPhases.includes(option)
      ),
    [excludedPhases, selectedPhases]
  );
  const isDisabled = disabled || availableOptions.length === 0;

  const items = useMemo(
    () =>
      availableOptions.map((option) => {
        const icon =
          option === 'delete' ? 'trash' : <EuiIcon type="dot" color={ilmPhases[option].color} />;

        return (
          <EuiContextMenuItem
            key={option}
            icon={icon}
            layoutAlign="top"
            css={{
              padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
            }}
            data-test-subj={`${dataTestSubj}Option-${option}`}
            onClick={() => {
              togglePopover(false);
              onSelect(option);
            }}
          >
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">{PHASE_LABELS[option]}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {ilmPhases[option].description}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiContextMenuItem>
        );
      }),
    [
      availableOptions,
      dataTestSubj,
      euiTheme.size.m,
      euiTheme.size.s,
      ilmPhases,
      onSelect,
      togglePopover,
    ]
  );

  const trigger = renderButton({
    disabled: isDisabled,
    onClick: () => togglePopover(),
    'data-test-subj': `${dataTestSubj}Button`,
    'aria-label': i18n.translate('xpack.streams.ilmPhaseSelect.buttonAriaLabel', {
      defaultMessage: 'Add ILM phase button',
    }),
  });

  return (
    <EuiPopover
      button={trigger}
      isOpen={isOpen}
      closePopover={() => togglePopover(false)}
      panelPaddingSize="none"
      anchorPosition={anchorPosition}
      offset={8}
      hasArrow={false}
      aria-label={i18n.translate('xpack.streams.ilmPhaseSelect.popoverAriaLabel', {
        defaultMessage: 'Add ILM phase popover',
      })}
      panelProps={{
        css: {
          maxWidth: 360,
        },
      }}
      data-test-subj={`${dataTestSubj}Popover`}
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};
