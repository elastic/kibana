import React from 'react';

import {
  KuiAccordian,
  KuiText,
  KuiCode,
  KuiSpacer,
} from '../../../../components';


export default () => (
  <div>
    <KuiAccordian
      buttonContent="Click me to toggle open / close"
    >
      <KuiText>
        <p>Any content inside of <KuiCode>KuiAccordian</KuiCode> will appear here.</p>
      </KuiText>
    </KuiAccordian>

    <KuiSpacer size="l" />

    <KuiAccordian
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
    </KuiAccordian>
  </div>
);
