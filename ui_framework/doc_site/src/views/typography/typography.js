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
        But the lazy dog wasn't lazy, it was just
        practicing mindfulness, so really in the long run it was much more satisfied with its
        life than that fox was.
      </p>
    </KuiText>
  </div>
);
