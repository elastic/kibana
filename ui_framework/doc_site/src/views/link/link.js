import React from 'react';

import {
  KuiLink,
  KuiText,
} from '../../../../components';

export default () => (
  <KuiText>
    <p>
      Open the {(
        <KuiLink
          href="http://www.elastic.co"
          target="_blank"
        >
          Elastic website
        </KuiLink>
      )} in a new tab.
    </p>
  </KuiText>
);
