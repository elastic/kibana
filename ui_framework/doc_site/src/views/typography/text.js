import React from 'react';

import {
  KuiText,
} from '../../../../components';

export default () => (
  <KuiText>
    <p>
      The quick brown fox jumped over the lazy dog. But the lazy dog wasn&rsquo;t lazy, it was {
      // react/jsx-closing-tag-location
      } <strong>just practicing mindfulness</strong>, so really in the long run it was much more {
      // react/jsx-closing-tag-location
      } <em>satisfied with its life</em> than that fox was.
    </p>
  </KuiText>
);
