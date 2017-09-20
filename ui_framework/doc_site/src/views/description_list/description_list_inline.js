import React from 'react';

import {
  KuiDescriptionList,
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
  <KuiDescriptionList
    type="inline"
    listItems={favoriteVideoGames}
    style={{ maxWidth: '400px' }}
  />
);
