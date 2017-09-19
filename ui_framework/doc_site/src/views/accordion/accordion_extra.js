import React from 'react';

import {
  KuiAccordion,
  KuiButton,
} from '../../../../components';

export default () => (
  <KuiAccordion
    buttonContent="Click to open"
    extraAction={<KuiButton size="small">Extra action!</KuiButton>}
  >
    <div>Opened content.</div>
  </KuiAccordion>
);
