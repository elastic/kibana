/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';
import { i18n } from '@kbn/i18n';
import { getSupportedFieldType } from '../../../common/components/fields_stats_grid/get_field_names';
import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';

interface Props {
  type: string | undefined;
  value: string;
  name: string;
}

export const FieldBadge: FC<Props> = ({ type, value, name }) => {
  const { euiColorLightestShade, euiColorLightShade } = useCurrentEuiTheme();
  const supportedType = getSupportedFieldType(type ?? 'unknown');
  const tooltip = type
    ? i18n.translate('xpack.dataVisualizer.file.fileContents.fieldBadge.tooltip', {
        defaultMessage: 'Type: {type}',
        values: { type: supportedType },
      })
    : undefined;
  return (
    <EuiToolTip title={name} content={tooltip}>
      <EuiBadge
        data-test-subj="dataVisualizerFieldBadge"
        css={{
          // magic numbers to align the badges with the text
          // and to align the icon correctly inside the badge.
          marginRight: '2px',
          marginTop: '-4px',
          padding: '0px 4px',
          cursor: 'pointer',
          pointerEvents: 'none',
          border: `1px solid ${euiColorLightShade}`,
          backgroundColor: euiColorLightestShade,
        }}
      >
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <FieldIcon
              type={supportedType}
              css={{
                marginRight: '4px',
                marginTop: '1px',
                border: `1px solid ${euiColorLightShade}`,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>{value}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiBadge>
    </EuiToolTip>
  );
};
