import React from 'react';

import {
  KuiAccordion,
  KuiText,
  KuiCode,
  KuiSpacer,
} from '../../../../components';


export default () => (
  <div>
    <KuiAccordion
      buttonContent="Click me to toggle open / close"
    >
      <KuiText>
        <p>Any content inside of <KuiCode>KuiAccordion</KuiCode> will appear here.</p>
      </KuiText>
    </KuiAccordion>

    <KuiSpacer size="l" />

    <KuiAccordion
      buttonContent="You can click me as well"
    >
      <KuiText>
        <p>The content inside can be of any height.</p>
        <p>The content inside can be of any height.</p>
        <p>The content inside can be of any height.</p>
        <p>The content inside can be of any height.</p>
        <p>The content inside can be of any height.</p>
        <p>The content inside can be of any height.</p>
      </KuiText>
    </KuiAccordion>
  </div>
);
