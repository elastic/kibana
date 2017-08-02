import React from 'react';

import {
  KuiButton,
} from '../../../../components/';

export default () => (
  <div>
    <KuiButton
      onClick={() => window.alert('Button clicked')}
      icon="arrowUp"
    >
      Default
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      fill
      icon="arrowDown"
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      icon="arrowLeft"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      icon="arrowRight"
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
      icon="arrowUp"
    >
      Default
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconReverse
      fill
      icon="arrowDown"
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconReverse
      icon="arrowLeft"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconReverse
      icon="arrowRight"
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      small and filled
    </KuiButton>

  </div>
);
