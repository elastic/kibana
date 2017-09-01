import React from 'react';

import {
  KuiAccordian,
  KuiButton,
} from '../../../../components';

export default () => (
  <KuiAccordian
    extraAction={<KuiButton size="small">Extra action!</KuiButton>}
  />
);
