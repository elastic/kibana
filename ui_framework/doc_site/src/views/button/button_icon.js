import React from 'react';

import {
  KuiButtonIcon,
} from '../../../../components';

export default () => (
  <div>
    <KuiButtonIcon
      onClick={() => window.alert('Button clicked')}
      iconType="arrowRight"
    />

    <KuiButtonIcon
      size="small"
      type="danger"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowRight"
    />

    <KuiButtonIcon
      size="small"
      type="disabled"
      onClick={() => window.alert('Button clicked')}
      iconType="arrowRight"
    />
  </div>
);

