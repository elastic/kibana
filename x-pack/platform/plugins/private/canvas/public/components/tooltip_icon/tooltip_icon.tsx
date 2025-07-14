/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint react/forbid-elements: 0 */
import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiIconTip, PropsOf } from '@elastic/eui';

export enum IconType {
  error = 'error',
  warning = 'warning',
  info = 'info',
}

type EuiIconTipProps = PropsOf<typeof EuiIconTip>;

interface Props extends Omit<EuiIconTipProps, 'type' | 'color'> {
  icon: IconType;
}

export const TooltipIcon: FC<Props> = ({ icon = IconType.info, ...rest }) => {
  const icons = {
    [IconType.error]: { type: 'error', color: 'danger' },
    [IconType.warning]: { type: 'warning', color: 'warning' },
    [IconType.info]: { type: 'info', color: 'default' },
  };

  return <EuiIconTip {...rest} type={icons[icon].type} color={icons[icon].color} />;
};

TooltipIcon.propTypes = {
  icon: PropTypes.string,
};
