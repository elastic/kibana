import React from 'react';

import {
  KuiButton,
  KuiLinkButton,
  KuiSubmitButton,
} from '../../../../components';

export default () => (
  <div>
    <KuiButton buttonType="basic">
      Button element
    </KuiButton>

    <br />
    <br />

    <form onSubmit={e => {
      e.preventDefault();
      window.alert('Submit');
    }}
    >
      <KuiSubmitButton buttonType="basic">
        Submit input element
      </KuiSubmitButton>
    </form>

    <br />

    <form onSubmit={e => {
      e.preventDefault();
      window.alert('Submit');
    }}
    >
      <KuiSubmitButton buttonType="basic" disabled>
        Submit input element, disabled
      </KuiSubmitButton>
    </form>

    <br />

    <KuiLinkButton
      buttonType="basic"
      href="http://www.google.com"
      target="_blank"
    >
      Anchor element
    </KuiLinkButton>

    <br />
    <br />

    <KuiLinkButton
      buttonType="basic"
      href="http://www.google.com"
      target="_blank"
      disabled
    >
      Anchor element, disabled
    </KuiLinkButton>
  </div>
);
