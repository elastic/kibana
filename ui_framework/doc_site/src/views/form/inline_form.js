import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
  KuiFormRow,
  KuiButton,
  KuiFieldText,
} from '../../../../components/';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

const idPrefix = makeId();

export default () => (
  <KuiFlexGroup style={{ maxWidth: 600 }}>
    <KuiFlexItem>
      <KuiFormRow label="First name"  id={idPrefix} helpText="I am helpful help text!">
        <KuiFieldText />
      </KuiFormRow>
    </KuiFlexItem>
    <KuiFlexItem>
      <KuiFormRow label="Last name" id={idPrefix}>
        <KuiFieldText />
      </KuiFormRow>
    </KuiFlexItem>
    <KuiFlexItem grow={false}>
      <KuiFormRow hasEmptyLabelSpace>
        <KuiButton>Save</KuiButton>
      </KuiFormRow>
    </KuiFlexItem>
  </KuiFlexGroup>
);
