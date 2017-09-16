import React from 'react';

import {
  KuiDescriptionList,
  KuiTitle,
  KuiHorizontalRule,
  KuiFlexItemPanel,
  KuiFlexItem,
  KuiFlexGroup,
  KuiIcon,
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
      <KuiDescriptionList type="column" listItems={favoriteVideoGames} />
    </KuiFlexItem>
    <KuiFlexItemPanel style={{ width: 300 }}>
      <KuiFlexGroup alignItems="center" gutterSize="small">
        <KuiFlexItem grow={false}>
          <KuiIcon type="bullseye" />
        </KuiFlexItem>
        <KuiFlexItem>
          <KuiTitle size="small">
            <h2>My favorite video games</h2>
          </KuiTitle>
        </KuiFlexItem>
      </KuiFlexGroup>
      <KuiHorizontalRule margin="small" />
      <KuiDescriptionList type="column" align="center" listItems={favoriteVideoGames} />
    </KuiFlexItemPanel>
  </KuiFlexGroup>
);
