import React from 'react';

import {
  KuiCallOut,
  KuiLink,
} from '../../../../components';

export default () => (
  <KuiCallOut
    title="Check it out, here's a really long title that will wrap within a narrower browser"
    iconType="search"
  >
    <p>
      Here&rsquo;s some stuff that you need to know. We can make this text really long so that,
      when viewed within a browser that&rsquo;s fairly narrow, it will wrap, too.
    </p>
    <p>
      And some other stuff on another line, just for kicks. And <KuiLink href="#">here&rsquo;s a link</KuiLink>.
    </p>
  </KuiCallOut>
);
