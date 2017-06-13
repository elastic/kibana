/* eslint-disable */
import React from 'react';

import {
  KuiTabsCompact
} from '../../../../components';

export default () => (
  <KuiTabsCompact tabTexts={[
                             "Cobalt",
                             "Dextrose",
                             "Helium-3",
                             "Monosodium Glutamate"
                           ]}
            onSelectedTabChanged={(tabIx,tabTitle)=>console.log(tabIx,tabTitle)}
  />
);
