import React from 'react';

import {
  KuiSmallTitle,
  KuiLargeTitle,
  KuiMediumTitle,
  KuiText,
} from '../../../../components';

export default () => (
  <div>
    <KuiLargeTitle>
      <h1>This is the title of the page -- descriptive enough for ya?</h1>
    </KuiLargeTitle>

    <KuiMediumTitle>
      <h2>And this is a section within the page</h2>
    </KuiMediumTitle>

    <KuiSmallTitle>
      <h3>Note</h3>
    </KuiSmallTitle>

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
