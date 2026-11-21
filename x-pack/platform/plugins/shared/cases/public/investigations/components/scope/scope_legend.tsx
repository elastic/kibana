/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { LINK_KIND_LABELS } from '../../../../common/investigations/types';
import type { LinkKind } from '../../../../common/investigations/types';
import { LINK_KIND_ICONS } from '../../icons';
import { getCriticalitySwatchColor, getLinkColor } from './scope_helpers';
import type { CriticalityTone } from './scope_helpers';
import * as i18n from './translations';

const LINK_KINDS: readonly LinkKind[] = [
  'execution',
  'ownership',
  'authentication',
  'network',
  'lateral_movement',
];

const CRITICALITY_LEGEND: ReadonlyArray<{ tone: CriticalityTone; label: string }> = [
  { tone: 'extreme', label: i18n.CRITICALITY_EXTREME },
  { tone: 'high', label: i18n.CRITICALITY_HIGH },
  { tone: 'medium', label: i18n.CRITICALITY_MEDIUM },
  { tone: 'low', label: i18n.CRITICALITY_LOW },
  { tone: 'none', label: i18n.CRITICALITY_NONE },
];

export const ScopeLegend: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      wrap
      responsive={false}
      role="group"
      aria-label={i18n.LEGEND_LABEL}
      data-test-subj="investigationScopeLegend"
    >
      {LINK_KINDS.map((kind) => (
        <EuiFlexItem grow={false} key={kind}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={LINK_KIND_ICONS[kind]}
                size="s"
                color={getLinkColor(kind, euiTheme)}
                aria-hidden="true"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {LINK_KIND_LABELS[kind]}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <span
              aria-hidden="true"
              css={css`
                display: inline-block;
                width: ${euiTheme.size.l};
                border-top: 2px dashed ${euiTheme.colors.warning};
              `}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.LEGEND_SUSPECTED}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <span
              aria-hidden="true"
              css={css`
                display: inline-block;
                width: ${euiTheme.size.base};
                height: ${euiTheme.size.base};
                border: 2px solid ${euiTheme.colors.primary};
                border-radius: ${euiTheme.border.radius.small};
              `}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.LEGEND_PRIMARY}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <span
              aria-hidden="true"
              css={css`
                display: inline-block;
                width: ${euiTheme.size.base};
                height: ${euiTheme.size.base};
                border: 1px dotted ${euiTheme.colors.mediumShade};
                background-color: ${euiTheme.colors.backgroundBaseSubdued};
                border-radius: ${euiTheme.border.radius.small};
              `}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.LEGEND_EXTERNAL}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow />
      {CRITICALITY_LEGEND.map(({ tone, label }) => (
        <EuiFlexItem grow={false} key={tone}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                aria-hidden="true"
                css={css`
                  display: inline-block;
                  width: ${euiTheme.size.s};
                  height: ${euiTheme.size.s};
                  border-radius: 50%;
                  background-color: ${getCriticalitySwatchColor(tone, euiTheme)};
                `}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {label}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
ScopeLegend.displayName = 'ScopeLegend';
