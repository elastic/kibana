import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
  KuiFormRow,
  KuiButton,
  KuiFieldText,
  KuiFieldNumber,
  KuiPageBody,
  KuiPageContent,
  KuiPageContentBody,
  KuiPageContentHeader,
  KuiPageContentHeaderSection,
  KuiTitle,
  KuiText,
  KuiHorizontalRule,
} from '../../../../components/';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

const idPrefix = makeId();

export default () => (

  <KuiPageBody>
    <KuiPageContent verticalPosition="center" horizontalPosition="center" style={{ width: 600 }}>
      <KuiPageContentHeader>
        <KuiPageContentHeaderSection>
          <KuiTitle>
            <h2>Apply width to FlexItems if you need</h2>
          </KuiTitle>
        </KuiPageContentHeaderSection>
      </KuiPageContentHeader>
      <KuiPageContentBody>
        <KuiText>
          <p>
            When you need to make a field smaller, always apply the width to the
            FlexItem, not the input. The input inside will resize as needed.
          </p>
        </KuiText>
        <KuiHorizontalRule />
        <KuiFlexGroup>
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
      </KuiPageContentBody>
    </KuiPageContent>
  </KuiPageBody>
);
