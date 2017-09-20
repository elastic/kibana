import React from 'react';

import {
  KuiDescriptionList,
  KuiFlexItem,
  KuiFlexGroup,
  KuiDescriptionListTitle,
  KuiDescriptionListDescription,
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
    <KuiFlexItem>
      <KuiDescriptionList>
        <KuiDescriptionListTitle>
          Dota 2
        </KuiDescriptionListTitle>
        <KuiDescriptionListDescription>
          A videogame that I have spent way too much time on over the years.
        </KuiDescriptionListDescription>
        <KuiDescriptionListTitle>
          Kings Quest VI
        </KuiDescriptionListTitle>
        <KuiDescriptionListDescription>
          The game that forced me to learn DOS.
        </KuiDescriptionListDescription>
      </KuiDescriptionList>
    </KuiFlexItem>
  </KuiFlexGroup>
);
