/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsOf } from '@elastic/eui';
import { EuiIcon, EuiText } from '@elastic/eui';
import _ from 'lodash';
import type { FC, ReactNode } from 'react';
import React from 'react';

import { constants } from '@kbn/security-ui-components';

interface Props extends PropsOf<typeof EuiText> {
  privilege: string | string[] | undefined;
  'data-test-subj'?: string;
}

export const PrivilegeDisplay: FC<Props> = (props: Props) => {
  return <SimplePrivilegeDisplay {...props} />;
};

const SimplePrivilegeDisplay: FC<Props> = (props: Props) => {
  const { privilege, ...rest } = props;

  const text = <EuiText {...rest}>{getDisplayValue(privilege)}</EuiText>;

  return text;
};

PrivilegeDisplay.defaultProps = {
  privilege: [],
};

function getDisplayValue(privilege: string | string[] | undefined) {
  const privileges = coerceToArray(privilege);

  let displayValue: string | ReactNode;

  const isPrivilegeMissing =
    privileges.length === 0 ||
    (privileges.length === 1 && privileges.includes(constants.NO_PRIVILEGE_VALUE));

  if (isPrivilegeMissing) {
    displayValue = <EuiIcon color="subdued" type={'minusInCircle'} />;
  } else {
    displayValue = privileges.map((p) => _.upperFirst(p)).join(', ');
  }

  return displayValue;
}

function coerceToArray(privilege: string | string[] | undefined): string[] {
  if (privilege === undefined) {
    return [];
  }
  if (Array.isArray(privilege)) {
    return privilege;
  }
  return [privilege];
}
