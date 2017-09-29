import React from 'react';

import {
  KuiButtonEmpty,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonEmpty
      onClick={() => window.alert('Button clicked')}
    >
      Primary
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButtonEmpty>

    <br/><br/>

    <KuiButtonEmpty
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      Primary
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      small
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      Primary
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      small
    </KuiButtonEmpty>

    <br/><br/>

    <KuiButtonEmpty
      type="danger"
      onClick={() => window.alert('Button clicked')}
    >
      Danger
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButtonEmpty>

    <br/><br/>

    <KuiButtonEmpty
      type="danger"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      Danger
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      small
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="danger"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      Danger
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      small
    </KuiButtonEmpty>

    <br/><br/>

    <KuiButtonEmpty
      type="text"
      onClick={() => window.alert('Button clicked')}
    >
      Text
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="text"
      size="small"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButtonEmpty>

    <br/><br/>

    <KuiButtonEmpty
      type="text"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      Text
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="text"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
    >
      small
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="text"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      Text
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="text"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
    >
      small
    </KuiButtonEmpty>

    <br/><br/>

    <KuiButtonEmpty
      type="danger"
      onClick={() => window.alert('Button clicked')}
      isDisabled
    >
      Disabled
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      isDisabled
    >
      small
    </KuiButtonEmpty>

    <br/><br/>

    <KuiButtonEmpty
      type="danger"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      isDisabled
    >
      Disabled
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      isDisabled
    >
      small
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="danger"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
      isDisabled
    >
      Disabled
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      type="danger"
      size="small"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowDown"
      iconSide="right"
      isDisabled
    >
      small
    </KuiButtonEmpty>
  </div>
);
