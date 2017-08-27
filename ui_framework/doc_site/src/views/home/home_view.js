import React from 'react';

import {
  KuiText,
} from '../../../../components';

export const HomeView = () => (
  <div>
    <KuiText>
      <h1>Kibana UI Framework</h1>
      <p>
        The Kibana team uses the UI Framework to build Kibana&rsquo;s user interface. Please see
        the <a href="https://www.elastic.co/guide/en/kibana/current/index.html">general Kibana docs</a> for information on how to use Kibana, and
        the <a href="https://www.elastic.co/guide/en/kibana/current/kibana-plugins.html">plugin-specific section</a> for
        help developing Kibana plugins.
      </p>

      <p>
        You can find the source for the UI Framework
        at the <a href="https://github.com/elastic/kibana/tree/master/ui_framework">Kibana repo</a>.
      </p>
    </KuiText>
  </div>
);
