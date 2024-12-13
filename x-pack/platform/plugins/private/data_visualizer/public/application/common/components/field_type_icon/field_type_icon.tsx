/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { getFieldTypeName } from '@kbn/field-utils';
import './_index.scss';

interface FieldTypeIconProps {
  tooltipEnabled: boolean;
  type: string;
}

export const FieldTypeIcon: FC<FieldTypeIconProps> = ({ tooltipEnabled = false, type }) => {
  const label =
    getFieldTypeName(type) ??
    i18n.translate('xpack.dataVisualizer.fieldTypeIcon.fieldTypeTooltip', {
      defaultMessage: '{type} type',
      values: { type },
    });
  if (tooltipEnabled === true) {
    return (
      <EuiToolTip
        anchorClassName="dvFieldTypeIcon__anchor"
        content={label}
        data-test-subj="dvFieldTypeTooltip"
        position="left"
      >
        <FieldIcon type={type} data-test-subj={`dvFieldTypeIcon-${type}`} />
      </EuiToolTip>
    );
  }

  return <FieldIcon type={type} label={label} />;
};
