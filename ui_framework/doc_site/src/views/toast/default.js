import React from 'react';

import {
  KuiLink,
  KuiText,
  KuiToast,
} from '../../../../components';

export default () => (
  <div>
    <KuiToast
      title="Check it out, here's a really long title that will wrap within a narrower browser"
      iconType="user"
      onClose={() => window.alert('Dismiss toast')}
    >
      <KuiText size="small" verticalRhythm>
        <p>
          Here&rsquo;s some stuff that you need to know. We can make this text really long so that,
          when viewed within a browser that&rsquo;s fairly narrow, it will wrap, too.
        </p>
      </KuiText>

      <KuiText size="small">
        <p>
          And some other stuff on another line, just for kicks. And <KuiLink href="#">here&rsquo;s a link</KuiLink>.
        </p>
      </KuiText>
    </KuiToast>

    <br />

    <KuiToast
      title="Check it out, here's a really long title that will wrap within a narrower browser"
      iconType="user"
      onClose={() => window.alert('Dismiss toast')}
    />
  </div>
);
