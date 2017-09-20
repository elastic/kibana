import React from 'react';

import {
  KuiDescriptionList,
  KuiSpacer,
} from '../../../../components';

const favoriteVideoGames = [
  {
    title: 'The Elder Scrolls: Morrowind',
    description: 'The opening music alone evokes such strong memories.',
  },
  {
    title: 'TIE Fighter',
    description: 'The sequel to XWING, join the dark side and fly for the Emporer.',
  },
  {
    title: 'Quake 2',
    description: 'The game that made me drop out of college.',
  },
];
export default () => (
  <div style={{ maxWidth: '400px' }}>
    <KuiDescriptionList
      listItems={favoriteVideoGames}
      align="center"
      compressed
    />

    <KuiSpacer size="l" />

    <KuiDescriptionList
      listItems={favoriteVideoGames}
      type="column"
      align="center"
      compressed
    />

    <KuiSpacer size="l" />

    <KuiDescriptionList
      listItems={favoriteVideoGames}
      type="inline"
      align="center"
      compressed
    />
  </div>
);
