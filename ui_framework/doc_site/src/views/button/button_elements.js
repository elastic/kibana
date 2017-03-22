import React from 'react';

import {
  KuiButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton type={KuiButton.TYPE.BASIC}>
      Button element
    </KuiButton>

    &nbsp;

    <form onSubmit={e => {
      e.preventDefault();
      console.log('Submit');
    }}>
      <KuiButton type={KuiButton.TYPE.BASIC} isSubmit>
        Submit input element
      </KuiButton>
    </form>

    &nbsp;

    <KuiButton
      type={KuiButton.TYPE.BASIC}
      href="http://www.google.com"
      target="_blank"
    >
      Anchor element
    </KuiButton>
  </div>
);
