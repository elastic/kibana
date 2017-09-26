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
    <p>
      This link is actually a {(
        <KuiLink
          onClick={() => window.alert('Button clicked')}
        >
          button
        </KuiLink>
      )} with an onClick event.

    </p>
    <p>Links can be colored as well.</p>
    <ul>
      <li>
        <KuiLink color="subdued" href="#">
          subdued
        </KuiLink>
      </li>
      <li>
        <KuiLink color="secondary" href="#">
          secondary
        </KuiLink>
      </li>
      <li>
        <KuiLink color="accent" href="#">
          accent
        </KuiLink>
      </li>
      <li>
        <KuiLink color="danger" href="#">
          danger
        </KuiLink>
      </li>
      <li>
        <KuiLink color="warning" href="#">
          warning
        </KuiLink>
      </li>
      <li>
        <KuiLink color="ghost" href="#">
          ghost
        </KuiLink>
      </li>
    </ul>
  </KuiText>
);
