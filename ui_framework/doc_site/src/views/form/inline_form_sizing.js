import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
  KuiFormRow,
  KuiButton,
  KuiFieldText,
  KuiFieldNumber,
} from '../../../../components/';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

const idPrefix = makeId();

export default () => (
  <KuiFlexGroup style={{ maxWidth: 600 }}>
    <KuiFlexItem grow={false} style={{ width: 100 }}>
      <KuiFormRow label="Age"  id={idPrefix}>
        <KuiFieldNumber max={10} placeholder={42} />
      </KuiFormRow>
    </KuiFlexItem>
    <KuiFlexItem>
      <KuiFormRow label="Full name" id={idPrefix}>
        <KuiFieldText icon="user" placeholder="John Doe" />
      </KuiFormRow>
    </KuiFlexItem>
    <KuiFlexItem grow={false}>
      <KuiFormRow hasEmptyLabelSpace>
        <KuiButton>Save</KuiButton>
      </KuiFormRow>
    </KuiFlexItem>
  </KuiFlexGroup>
);
