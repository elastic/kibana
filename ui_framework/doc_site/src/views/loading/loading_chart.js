import React from 'react';

import {
  KuiLoadingChart,
} from '../../../../components';

export default () => (
  <div>
    <KuiLoadingChart size="medium"/>

    &nbsp;&nbsp;

    <KuiLoadingChart size="large"/>

    &nbsp;&nbsp;

    <KuiLoadingChart size="xLarge"/>

    <br/><br/>

    <KuiLoadingChart mono size="medium"/>

    &nbsp;&nbsp;

    <KuiLoadingChart mono size="large"/>

    &nbsp;&nbsp;

    <KuiLoadingChart mono size="xLarge"/>
  </div>
);

