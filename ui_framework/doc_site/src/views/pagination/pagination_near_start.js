import React from 'react';

import {
  KuiPagination,
} from '../../../../components';

const pages = [
  { number: 1, link: '#' },
  { number: 2, link: '#' },
  { number: 3, link: '#' },
  { number: 4, link: '#' },
  { number: 5, link: '#' },
];

export default () => (
  <KuiPagination pageList={pages} activePage={2} lastPage={5} />
);

