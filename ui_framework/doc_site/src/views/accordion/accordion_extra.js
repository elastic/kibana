import React from 'react';

import {
  KuiAccordion,
  KuiButton,
} from '../../../../components';

export default () => (
  <KuiAccordion
    extraAction={<KuiButton size="small">Extra action!</KuiButton>}
  />
);
