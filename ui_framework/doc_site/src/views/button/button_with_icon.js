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
      Primary
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
      iconSide="right"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowUp"
    >
      Primary
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconSide="right"
      fill
      iconType="arrowDown"
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconSide="right"
      iconType="arrowLeft"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconSide="right"
      iconType="arrowRight"
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      small and filled
    </KuiButton>

    <br/><br/>

    <KuiButton
      iconSide="right"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowUp"
      isDisabled
    >
      Disabled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconSide="right"
      fill
      iconType="arrowDown"
      onClick={() => window.alert('Button clicked')}
      isDisabled
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconSide="right"
      iconType="arrowLeft"
      size="small"
      onClick={() => window.alert('Button clicked')}
      isDisabled
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      iconSide="right"
      iconType="arrowRight"
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
      isDisabled
    >
      small and filled
    </KuiButton>
  </div>
);
