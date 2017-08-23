import React from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
  KuiFormRow,
  KuiButton,
  KuiFieldText,
  KuiPageBody,
  KuiPageContent,
  KuiPageContentBody,
  KuiPageContentHeader,
  KuiPageContentHeaderSection,
  KuiTitle,
} from '../../../../components/';

function makeId() {
  return Math.random().toString(36).substr(2, 5);
}

const idPrefix = makeId();

export default () => (

  <KuiPageBody>
    <KuiPageContent verticalPosition="center" horizontalPosition="center">
      <KuiPageContentHeader>
        <KuiPageContentHeaderSection>
          <KuiTitle>
            <h2>Form gallery</h2>
          </KuiTitle>
        </KuiPageContentHeaderSection>
      </KuiPageContentHeader>
      <KuiPageContentBody>
        <KuiFlexGroup>
          <KuiFlexItem>
            <KuiFormRow label="First name"  id={idPrefix} helpText="Your name dummy!">
              <KuiFieldText />
            </KuiFormRow>
          </KuiFlexItem>
          <KuiFlexItem>
            <KuiFormRow label="Last name" id={idPrefix}>
              <KuiFieldText />
            </KuiFormRow>
          </KuiFlexItem>
          <KuiFlexItem>
            <KuiFormRow addEmptyLabelSpace>
              <KuiButton>Save</KuiButton>
            </KuiFormRow>
          </KuiFlexItem>
        </KuiFlexGroup>
      </KuiPageContentBody>
    </KuiPageContent>
  </KuiPageBody>
);
