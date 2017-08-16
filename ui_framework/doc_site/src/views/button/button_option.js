import React from 'react';

import {
  KuiButtonOption,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonOption
      onClick={() => window.alert('Button clicked')}
    >
      Primary
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButtonOption>

    <br/><br/>

    <KuiButtonOption
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      Primary
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      small
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      Primary
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      small
    </KuiButtonOption>

    <br/><br/>

    <KuiButtonOption
      type="danger"
      onClick={() => window.alert('Button clicked')}
    >
      Danger
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButtonOption>

    <br/><br/>

    <KuiButtonOption
      type="danger"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      Danger
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      small
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      type="danger"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      Danger
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      small
    </KuiButtonOption>

    <br/><br/>

    <KuiButtonOption
      type="danger"
      onClick={() => window.alert('Button clicked')}
      isDisabled
    >
      Disabled
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      isDisabled
    >
      small
    </KuiButtonOption>

    <br/><br/>

    <KuiButtonOption
      type="danger"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      isDisabled
    >
      Disabled
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      isDisabled
    >
      small
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      type="danger"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
      isDisabled
    >
      Disabled
    </KuiButtonOption>

    &nbsp;&nbsp;

    <KuiButtonOption
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
      isDisabled
    >
      small
    </KuiButtonOption>
  </div>
);
