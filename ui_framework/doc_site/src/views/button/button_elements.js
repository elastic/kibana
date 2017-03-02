import React from 'react';

import {
  KuiBasicButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiBasicButton>
      Button element
    </KuiBasicButton>

    &nbsp;

    <form onSubmit={e => {
      e.preventDefault();
      console.log('Submit');
    }}>
      <KuiBasicButton isSubmit>
        Submit input element
      </KuiBasicButton>
    </form>

    &nbsp;

    <KuiBasicButton
      href="http://www.google.com"
      target="_blank"
    >
      Anchor element
    </KuiBasicButton>
  </div>
);
