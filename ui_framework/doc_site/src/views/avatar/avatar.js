import React from 'react';

import {
  KuiAvatar,
  KuiHorizontalRule,
} from '../../../../components';

export default () => (
  <div>
    <KuiAvatar size="s" name="Rafael"/>
    <KuiAvatar size="m" name="Donatello" />
    <KuiAvatar size="l" name="Leornardo" />
    <KuiAvatar size="xl" name="Michaelangelo" />

    <KuiHorizontalRule margin="large" />

    <KuiAvatar size="s" name="Cat" imageUrl="http://lorempixel.com/64/64/cats/" />
    <KuiAvatar size="m" name="Cat" imageUrl="http://lorempixel.com/64/64/cats/" />
    <KuiAvatar size="l"  name="Cat" imageUrl="http://lorempixel.com/64/64/cats/" />
    <KuiAvatar size="xl" name="Cat" imageUrl="http://lorempixel.com/64/64/cats/" />
  </div>
);
