import React from 'react';

import {
  KuiCodeEditor
} from '../../../../components';

export default () => (
  <KuiCodeEditor
    mode="less"
    theme="github"
    width="100%"
    setOptions={{ fontSize: '14px' }}
    onBlur={() => window.alert('KuiCodeEditor.onBlur() called')}
  />
);
