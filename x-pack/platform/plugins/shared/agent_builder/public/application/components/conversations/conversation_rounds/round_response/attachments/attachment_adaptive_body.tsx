/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { KibanaAdaptiveView, createKibanaAdapterServices } from '@kbn/adaptive-ui/react';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { useKibana } from '../../../../../hooks/use_kibana';

/**
 * Renders an attachment body from its {@link ViewSpec}. Uses the `html` surface
 * so the view arrives with its CSS inlined behind a shadow root; the `react`
 * surface renders bare markup unless the host loads
 * `@kbn/adaptive-ui/styles.css`, which `agent_builder` does not.
 */
export const AttachmentAdaptiveBody: React.FC<{ spec: ViewSpec }> = ({ spec }) => {
  const { services } = useKibana();
  const { euiTheme } = useEuiTheme();
  const adapterServices = React.useMemo(() => createKibanaAdapterServices(services), [services]);

  return (
    <div
      css={css`
        width: 100%;
        padding: ${euiTheme.size.l};
      `}
    >
      <KibanaAdaptiveView
        surface="html"
        spec={spec}
        services={adapterServices}
        framed={false}
        fluid
      />
    </div>
  );
};
