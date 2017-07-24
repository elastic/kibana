import React from 'react';

import {
  KuiObjectTitle,
  KuiPageTitle,
  KuiSectionTitle,
  KuiText,
} from '../../../../components';

export default () => (
  <div>
    <KuiPageTitle>
      <h1>This is the title of the page -- descriptive enough for ya?</h1>
    </KuiPageTitle>

    <KuiSectionTitle>
      <h2>And this is a section within the page</h2>
    </KuiSectionTitle>

    <KuiObjectTitle>
      <h3>Note</h3>
    </KuiObjectTitle>

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
