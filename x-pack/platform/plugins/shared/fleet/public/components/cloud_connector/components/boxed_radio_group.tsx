/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import camelCase from 'lodash/camelCase';
import { useEuiTheme, EuiButton, EuiRadio, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';

export interface BoxedRadioOption {
  disabled?: boolean;
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
  testId?: string;
}

export interface BoxedRadioGroupProps {
  disabled?: boolean;
  options: BoxedRadioOption[];
  onChange(id: string): void;
  idSelected: string;
  size?: 's' | 'm';
  name?: string;
}

/**
 * A radio group rendered as styled boxed buttons.
 * Matches the visual pattern from kbn-cloud-security-posture's RadioGroup (csp_boxed_radio_group).
 */
export const BoxedRadioGroup = ({
  idSelected,
  size,
  options,
  disabled,
  onChange,
  name,
}: BoxedRadioGroupProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-flow: row wrap;
        gap: ${euiTheme.size.s};

        @media only screen and (max-width: ${euiTheme.breakpoint.m}px) {
          .euiToolTipAnchor {
            min-width: 100%;
          }
        }
      `}
    >
      {options.map((option) => {
        const isChecked = option.id === idSelected;
        return (
          <EuiToolTip
            key={option.id}
            content={option.tooltip}
            anchorProps={{
              style: {
                flex: '1 1 0',
              },
            }}
          >
            <EuiButton
              disabled={option.disabled || disabled}
              color={isChecked ? 'primary' : 'text'}
              onClick={() => onChange(option.id)}
              iconType={option.icon}
              iconSide="right"
              contentProps={{
                style: {
                  justifyContent: 'flex-start',
                },
              }}
              css={css`
                width: 100%;
                height: ${size === 's' ? euiTheme.size.xxl : euiTheme.size.xxxl};
                svg,
                img {
                  margin-left: auto;
                }

                &:disabled {
                  svg,
                  img {
                    filter: grayscale(1);
                  }
                }
              `}
            >
              <EuiRadio
                data-test-subj={option.testId}
                label={option.label}
                id={option.id}
                checked={isChecked}
                onChange={() => {}}
                name={name || camelCase(option.label || 'optionsGroup')}
              />
            </EuiButton>
          </EuiToolTip>
        );
      })}
    </div>
  );
};
