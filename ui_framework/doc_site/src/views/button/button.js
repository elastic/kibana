import React from 'react';

import {
  KuiButton,
} from '../../../../components/';

export default () => (
  <div>
    <KuiButton
      onClick={() => window.alert('Button clicked')}
    >
      Primary
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      fill
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      small and filled
    </KuiButton>

    <br/><br/>

    <KuiButton
      type="secondary"
      onClick={() => window.alert('Button clicked')}
    >
      Secondary
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      type="secondary"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      type="secondary"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      type="secondary"
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      small and filled
    </KuiButton>

    <br/><br/>

    <KuiButton
      type="warning"
      onClick={() => window.alert('Button clicked')}
    >
      Warning
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      type="warning"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      type="warning"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      type="warning"
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      small and filled
    </KuiButton>

    <br/><br/>

    <KuiButton
      type="danger"
      onClick={() => window.alert('Button clicked')}
    >
      Danger
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      type="danger"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      type="danger"
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      small and filled
    </KuiButton>

    <br/><br/>

    <KuiButton
      isDisabled
      onClick={() => window.alert('Button clicked')}
    >
      Disabled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      isDisabled
      fill
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      isDisabled
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      isDisabled
      size="small"
      fill
      onClick={() => window.alert('Button clicked')}
    >
      small and filled
    </KuiButton>

  </div>
);
