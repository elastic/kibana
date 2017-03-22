import React from 'react';

import {
  KuiButton,
  KuiLinkButton,
  KuiSubmitButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton type={KuiButton.TYPE.BASIC}>
      Button element
    </KuiButton>

    &nbsp;

    <form onSubmit={e => {
      e.preventDefault();
      window.alert('Submit');
    }}>
      <KuiSubmitButton type={KuiSubmitButton.TYPE.BASIC}>
        Submit input element
      </KuiSubmitButton>
    </form>

    &nbsp;

    <KuiLinkButton
      type={KuiLinkButton.TYPE.BASIC}
      href="http://www.google.com"
      target="_blank"
    >
      Anchor element
    </KuiLinkButton>
  </div>
);
