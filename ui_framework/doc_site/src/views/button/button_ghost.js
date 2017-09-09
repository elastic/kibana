import React from 'react';

import {
  KuiButton,
  KuiButtonEmpty,
  KuiButtonIcon,
} from '../../../../components';

export default () => (
  <div className="guideDemo__ghostBackground">
    <KuiButton
      type="ghost"
      onClick={() => window.alert('Button clicked')}
    >
      Primary
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButton
      fill
      type="ghost"
      size="small"
      iconType="check"
      onClick={() => window.alert('Button clicked')}
    >
      Filled
    </KuiButton>

    &nbsp;&nbsp;

    <KuiButtonEmpty
      size="small"
      type="ghost"
      onClick={() => window.alert('Button clicked')}
    >
      small
    </KuiButtonEmpty>

    &nbsp;&nbsp;

    <KuiButtonIcon
      size="small"
      type="ghost"
      iconType="user"
      onClick={() => window.alert('Button clicked')}
    />
  </div>
);
