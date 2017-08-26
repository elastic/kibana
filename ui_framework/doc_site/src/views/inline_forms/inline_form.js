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
            <h2>Inline form</h2>
          </KuiTitle>
        </KuiPageContentHeaderSection>
      </KuiPageContentHeader>
      <KuiPageContentBody>
        <KuiText>
          <p>
            Inline forms can be made with FlexGroup. Apply grow=false on any
            of the items you want to collapse (like this button). Note that the button
            FormRow component also requires an additional prop because it&rsquo;s missing a label.
          </p>
        </KuiText>
        <KuiHorizontalRule />
        <KuiFlexGroup>
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
      </KuiPageContentBody>
    </KuiPageContent>
  </KuiPageBody>
);
