import React from 'react';

import {
  KuiTitle,
  KuiText,
} from '../../../../components';

export default () => (
  <div>
    <KuiTitle size="large">
      <h1>This is the title of the page -- descriptive enough for ya?</h1>
    </KuiTitle>

    <KuiTitle>
      <h2>And this is a section within the page</h2>
    </KuiTitle>

    <KuiTitle size="small">
      <h3>Note</h3>
    </KuiTitle>

    <KuiText>
      <p>
        The quick brown fox jumped over the lazy dog.
      </p>
    </KuiText>

    <KuiText>
      <p>
        But the dog wasn't lazy, it was just
        practicing mindfulness, so it had a greater sense of
        life-satisfaction than that fox with all its jumping.
      </p>
    </KuiText>
  </div>
);
