/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Fragment } from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';

export interface SettingsListItem {
  id: string;
  label: NonNullable<ReactNode>;
  value: NonNullable<ReactNode>;
  /** Shown in a tooltip on an info icon next to the label. */
  info?: ReactNode;
  isMuted?: boolean;
}

interface SettingsListProps {
  items: SettingsListItem[];
  'data-test-subj'?: string;
}

/** Label and value pairs, side by side on wide screens and stacked on narrow ones. */
export const SettingsList = ({ items, 'data-test-subj': dataTestSubj }: SettingsListProps) => {
  return (
    <EuiDescriptionList
      type="responsiveColumn"
      compressed
      columnWidths={[2, 3]}
      rowGutterSize="m"
      css={{ alignItems: 'start' }}
      data-test-subj={dataTestSubj}
    >
      {items.map(({ id, label, value, info, isMuted = false }) => (
        <Fragment key={id}>
          <EuiDescriptionListTitle>
            {/* The info icon takes the label's color, muted or not. */}
            <EuiTextColor component="div" color={isMuted ? 'subdued' : 'inherit'}>
              {info ? (
                <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>{label}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIconTip content={info} type="info" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                label
              )}
            </EuiTextColor>
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj={`searchBoostSetting-${id}`}>
            {/* A compressed list sets its descriptions a size smaller than its titles. */}
            <EuiText size="s">{value}</EuiText>
          </EuiDescriptionListDescription>
        </Fragment>
      ))}
    </EuiDescriptionList>
  );
};
