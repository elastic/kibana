import React from 'react';

import {
  KuiText,
  KuiToast,
} from '../../../../components';

export default () => (
  <KuiToast
    title="This is an example of a poor toast title. It's way too long."
    type="success"
    iconType="user"
  >
    <KuiText size="small" verticalRhythm>
      <p>
        While the layout will adjust properly for wrapping titles, they don't look particularly good.
        Similarily, don't use a whole lot of text in your body either. At a certain point people won't
        have enough time to read these things. Like, you probably aren't even reading this now.
      </p>
    </KuiText>

    <KuiText size="small">
      <p>
        You shouldn't even need a second paragraph. Again, we're getting long winded here.
      </p>
    </KuiText>
  </KuiToast>
);
