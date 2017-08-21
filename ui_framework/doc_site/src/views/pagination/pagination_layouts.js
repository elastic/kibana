import React from 'react';

import {
  KuiPagination,
  KuiFlexGroup,
  KuiFlexItem,
  KuiHorizontalRule,
  KuiText,
} from '../../../../components';

const pages = [
  { number: 5, link: '#' },
  { number: 6, link: '#' },
  { number: 7, link: '#' },
  { number: 8, link: '#' },
  { number: 9, link: '#' },
];

export default () => (
  <div>
    <KuiHorizontalRule />

    <KuiFlexGroup growItems={false} justifyContent="spaceAround">
      <KuiFlexItem>
        <KuiPagination pageList={pages} activePage={7} lastPage={42} />
      </KuiFlexItem>
    </KuiFlexGroup>

    <KuiHorizontalRule />

    <KuiFlexGroup growItems={false} justifyContent="spaceBetween" alignItems="center">
      <KuiFlexItem>
        <KuiText size="small"><p>5000 results, returned in 2.03 secs.</p></KuiText>
      </KuiFlexItem>
      <KuiFlexItem>
        <KuiPagination pageList={pages} activePage={7} lastPage={42} />
      </KuiFlexItem>
    </KuiFlexGroup>
  </div>
);
