/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiToolTip, type EuiToolTipProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const MissingPrivilegesToolTip: React.FC<{
  children: React.ReactElement;
  missingPrivilege?: string;
  position?: EuiToolTipProps['position'];
}> = ({ children, missingPrivilege, position }) => {
  if (!missingPrivilege) {
    return children;
  }
  return (
    <EuiToolTip
      content={i18n.translate('xpack.fleet.missingPrivilegesToolTip', {
        defaultMessage:
          'You are not authorized to perform that action. It requires the {missingPrivilege} Kibana privilege for Fleet.',
        values: {
          missingPrivilege,
        },
      })}
      position={position}
    >
      {children}
    </EuiToolTip>
  );
};
