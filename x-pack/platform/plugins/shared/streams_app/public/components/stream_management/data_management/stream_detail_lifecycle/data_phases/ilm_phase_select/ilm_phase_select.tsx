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
import {
  DefaultRepositoryRequiredBadge,
  EnterpriseLicenseRequiredBadge,
  PHASE_ORDER,
  PHASE_TITLES,
} from '@kbn/data-lifecycle-phases';
import { useIlmPhasesColorAndDescription } from '../../hooks/use_ilm_phases_color_and_description';

export type IlmPhaseSelectOption = (typeof PHASE_ORDER)[number];

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
  showEnterpriseLicenseRequiredBadge?: boolean;
  showDefaultRepositoryRequiredBadge?: boolean;
  'data-test-subj'?: string;
}

export const IlmPhaseSelect = ({
  renderButton,
  selectedPhases,
  onSelect,
  excludedPhases = [],
  disabled = false,
  initialIsOpen = false,
  anchorPosition = 'downCenter',
  showEnterpriseLicenseRequiredBadge = false,
  showDefaultRepositoryRequiredBadge = false,
  'data-test-subj': dataTestSubj = 'ilmPhaseSelect',
}: IlmPhaseSelectProps) => {
  const [isOpen, togglePopover] = useToggle(initialIsOpen);

  const { euiTheme } = useEuiTheme();
  const { ilmPhases } = useIlmPhasesColorAndDescription();

  const availableOptions = useMemo(
    () =>
      PHASE_ORDER.filter(
        (option) => !selectedPhases.includes(option) && !excludedPhases.includes(option)
      ),
    [excludedPhases, selectedPhases]
  );
  const isDisabled = disabled || availableOptions.length === 0;

  const items = useMemo(
    () =>
      availableOptions.map((option) => {
        const icon =
          option === 'delete' ? (
            'trash'
          ) : (
            <EuiIcon type="dot" color={ilmPhases[option].color} aria-hidden={true} />
          );

        const frozenBadge = (() => {
          if (option !== 'frozen') return;

          if (showEnterpriseLicenseRequiredBadge) {
            return {
              kind: 'enterpriseRequired' as const,
              testSubj: `${dataTestSubj}Option-${option}-enterpriseRequiredBadge`,
            };
          }

          if (showDefaultRepositoryRequiredBadge) {
            return {
              kind: 'defaultRepositoryRequired' as const,
              testSubj: `${dataTestSubj}Option-${option}-defaultRepositoryRequiredBadge`,
            };
          }
        })();

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
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">{PHASE_TITLES[option]}</EuiText>
                  </EuiFlexItem>
                  {frozenBadge && (
                    <EuiFlexItem grow={false}>
                      {frozenBadge.kind === 'enterpriseRequired' ? (
                        <EnterpriseLicenseRequiredBadge data-test-subj={frozenBadge.testSubj} />
                      ) : (
                        <DefaultRepositoryRequiredBadge data-test-subj={frozenBadge.testSubj} />
                      )}
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
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
      showDefaultRepositoryRequiredBadge,
      showEnterpriseLicenseRequiredBadge,
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
