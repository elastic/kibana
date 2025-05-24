/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBetaBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';

const styles = {
  badge: css`
    vertical-align: middle;
  `,
};

const defaultLabel = i18n.translate('xpack.lens.experimentalLabel', {
  defaultMessage: 'Technical preview',
});

export const ExperimentalBadge = ({
  label = defaultLabel,
  color,
  size = 's',
}: {
  label?: string;
  color?: 'subdued' | undefined;
  size?: 's' | 'm';
}) => {
  return (
    <EuiToolTip content={label}>
      <EuiBetaBadge
        className={styles.badge}
        iconType="beaker"
        label={label}
        size={size}
        color={color}
      />
    </EuiToolTip>
  );
};
