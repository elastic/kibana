import React from 'react';

import {
  KuiDescriptionList,
  KuiTitle,
  KuiHorizontalRule,
  KuiFlexItemPanel,
  KuiFlexItem,
  KuiFlexGroup,
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
  <KuiFlexGroup>
    <KuiFlexItem>
      <KuiDescriptionList listItems={favoriteVideoGames} />
    </KuiFlexItem>
    <KuiFlexItemPanel style={{ width: 300 }}>
      <KuiTitle size="small">
        <h2>My favorite video games</h2>
      </KuiTitle>

      <KuiHorizontalRule margin="small" />

      <KuiDescriptionList listItems={favoriteVideoGames} />
    </KuiFlexItemPanel>
  </KuiFlexGroup>
);
