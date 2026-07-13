/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { ExportJsonFlyout, ExportJsonFlyoutContext } from '@kbn/as-code-export-utils';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { LensWireAPIConfig } from '@kbn/lens-common-2';
import type { ExportShareParameters, SharePluginStart } from '@kbn/share-plugin/public';

import React from 'react';

export const getExportJsonConfig = (services: {
  core: CoreStart;
  share: SharePluginStart | undefined;
}): ExportShareParameters => ({
  label: ({ openFlyout }) => (
    <EuiButtonEmpty
      size="s"
      iconType="code"
      onClick={openFlyout}
      data-test-subj="exportMenuItem-JSON"
    >
      {i18n.translate('links.exportJson.label', {
        defaultMessage: 'JSON',
      })}
    </EuiButtonEmpty>
  ),
  shouldRender: () => true,
  flyoutSizing: {
    size: 'm',
    maxWidth: 1000,
  },
  flyoutContent: ({ closeFlyout }) => {
    return (
      <ExportJsonFlyoutContext.Provider value={{ services }}>
        <ExportJsonFlyout<LensWireAPIConfig>
          closeFlyout={closeFlyout}
          apiPath={'/api/visualizations'}
        />
      </ExportJsonFlyoutContext.Provider>
    );
  },
});
