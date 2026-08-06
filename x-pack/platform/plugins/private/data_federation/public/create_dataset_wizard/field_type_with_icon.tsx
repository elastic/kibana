/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldIcon } from '@kbn/react-field';

import { AutoDetectedSuffix } from './auto_detected_suffix';
import { normalizeFieldTypeForIcon } from './field_type_icon_type';
import { formatInferredFieldTypeLabel } from './inferred_field_type_options';

export const FieldTypeWithIcon: FunctionComponent<{
  type: string;
  fillWidth?: boolean;
  showAutoDetectedSuffix?: boolean;
}> = ({ type, fillWidth = false, showAutoDetectedSuffix = false }) => {
  const fieldTypeLabel = formatInferredFieldTypeLabel(type);

  return (
  <EuiFlexGroup
    gutterSize="s"
    alignItems="center"
    responsive={false}
    css={
      fillWidth
        ? css`
            width: 100%;
            min-width: 0;
          `
        : undefined
    }
  >
    <EuiFlexItem grow={false}>
      <FieldIcon
        type={normalizeFieldTypeForIcon(type)}
        label={fieldTypeLabel}
        fill="none"
        className="eui-alignMiddle"
      />
    </EuiFlexItem>
    <EuiFlexItem grow={fillWidth} css={fillWidth ? css`min-width: 0;` : undefined}>
      {fieldTypeLabel}
    </EuiFlexItem>
    {showAutoDetectedSuffix ? (
      <EuiFlexItem grow={false}>
        <AutoDetectedSuffix />
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
  );
};
