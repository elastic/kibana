import React from 'react';

import {
  KuiPagination,
} from '../../../../components';

const pages = [
  { number: 5, link: '#' },
  { number: 6, link: '#' },
  { number: 7, link: '#' },
  { number: 8, link: '#' },
  { number: 9, link: '#' },
];

export default () => (
  <KuiPagination pageList={pages} activePage={7} lastPage={42} />
);
