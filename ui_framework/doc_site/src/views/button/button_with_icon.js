import React from 'react';

import {
  KuiButton,
} from '../../../../components/';

export default () => (
  <div>
    <KuiButton
      onClick={() => window.alert('Button clicked')}
      iconType="arrowUp"
    >
      Default
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      fill
      iconType="arrowDown"
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconType="arrowLeft"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconType="arrowRight"
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      small and filled
    </KuiButton>

    <br/><br/>

    <KuiButton
      iconReverse
      onClick={() => window.alert('Button clicked')}
      iconType="arrowUp"
    >
      Default
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconReverse
      fill
      iconType="arrowDown"
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconReverse
      iconType="arrowLeft"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconReverse
      iconType="arrowRight"
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      small and filled
    </KuiButton>

  </div>
);
