/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiTextColor } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';
import { ToolbarButton, ToolbarButtonProps } from './toolbar_button';

interface TriggerLabelProps {
  label: string;
  extraIcons?: Array<{
    component: React.ReactElement;
    value?: string;
    tooltipValue?: string;
    'data-test-subj': string;
  }>;
}

export type ChangeIndexPatternTriggerProps = ToolbarButtonProps &
  TriggerLabelProps & {
    label: string;
    title?: string;
    isDisabled?: boolean;
  };

const styles = {
  labelTruncate: css`
    display: block;
    min-width: 0;
  `,
  iconWrapper: css`
    display: block;
    *:hover &,
    *:focus & {
      text-decoration: none !important;
    }
  `,
  fullWidthText: css`
    width: 100%;
    line-height: 1.2em;
  `,
};

function TriggerLabel({ label, extraIcons }: TriggerLabelProps) {
  const { euiTheme } = useEuiTheme();

  if (!extraIcons?.length) {
    return <>{label}</>;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem className="eui-textTruncate" className={styles.labelTruncate}>
        {label}
      </EuiFlexItem>
      {extraIcons.map((icon) => (
        <EuiFlexItem
          grow={false}
          data-test-subj={icon['data-test-subj']}
          className={styles.iconWrapper}
          key={icon['data-test-subj']}
        >
          <EuiToolTip
            content={icon.tooltipValue}
            position="top"
            data-test-subj={`${icon['data-test-subj']}-tooltip`}
          >
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>{icon.component}</EuiFlexItem>
              {icon.value ? (
                <EuiFlexItem grow={false}>
                  <EuiTextColor color={euiTheme.colors.disabledText}>{icon.value}</EuiTextColor>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

export function TriggerButton({
  label,
  title,
  togglePopover,
  isMissingCurrent,
  extraIcons,
  ...rest
}: ChangeIndexPatternTriggerProps & {
  togglePopover: () => void;
  isMissingCurrent?: boolean;
}) {
  const colorProp = isMissingCurrent
    ? {
        color: 'danger' as const,
      }
    : {};

  return (
    <ToolbarButton
      title={title}
      onClick={() => togglePopover()}
      fullWidth
      {...colorProp}
      {...rest}
      textProps={{ className: styles.fullWidthText }}
    >
      <TriggerLabel label={label} extraIcons={extraIcons} />
    </ToolbarButton>
  );
}
