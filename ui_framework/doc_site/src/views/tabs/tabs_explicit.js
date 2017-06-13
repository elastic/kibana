/* eslint-disable */
import React from 'react';

import {
  KuiTabs,
  KuiTab
} from '../../../../components';

export default () => {
  const style = {
    backgroundColor: "aqua"
  };

  return <KuiTabs
           tabs={[
                  <KuiTab title="Cobalt"><span style={style}>Cobalt</span></KuiTab>,
                  <KuiTab title="Dextrose">Dextrose</KuiTab>,
                  <KuiTab title="Helium-3">Helium-3</KuiTab>,
                  <KuiTab title="Monosodium Glutamate">Monosodium Glutamate</KuiTab>
                ]}
            onSelectedTabChanged={(tabIx,tabTitle)=>console.log(tabIx,tabTitle)}
         />;
};
