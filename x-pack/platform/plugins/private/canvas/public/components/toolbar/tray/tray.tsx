/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, MouseEventHandler } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const strings = {
  getCloseTrayAriaLabel: () =>
    i18n.translate('xpack.canvas.toolbarTray.closeTrayAriaLabel', {
      defaultMessage: 'Close tray',
    }),
};

interface Props {
  children: ReactNode;
  done: MouseEventHandler<HTMLAnchorElement>;
}

export const Tray = ({ children, done }: Props) => {
  return (
    <>
      <EuiFlexGroup className="canvasTray__toggle" justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            size="s"
            onClick={done}
            aria-label={strings.getCloseTrayAriaLabel()}
            iconType="arrowDown"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div className="canvasTray">{children}</div>
    </>
  );
};

Tray.propTypes = {
  children: PropTypes.node.isRequired,
  done: PropTypes.func.isRequired,
};
