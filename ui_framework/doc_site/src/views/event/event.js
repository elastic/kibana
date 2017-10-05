import React from 'react';

import {
  KuiEvent,
  KuiEventSymbol,
  KuiEventBody,
  KuiEventBodyMessage,
  KuiEventBodyMetadata,
} from '../../../../components';

export default () => (
  <KuiEvent>
    <KuiEventSymbol>
      <span className="kuiIcon kuiIcon--error fa-warning" aria-label="Error" role="img"/>
    </KuiEventSymbol>

    <KuiEventBody>
      <KuiEventBodyMessage>
      minimum_master_nodes setting of 1 is less than quorum of 2
      </KuiEventBodyMessage>

      <KuiEventBodyMetadata>
        August 4, 2021
      </KuiEventBodyMetadata>
    </KuiEventBody>
  </KuiEvent>
);
