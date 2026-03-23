/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { SourcesList } from '../features/sources_list';
import { SourceSelectionFlyout } from '../features/add_source/source_selection_flyout';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';
import { useAddConnectorFlyout } from '../hooks/use_add_connector_flyout';
import type { Connector } from '../../types/connector';

export const SourcesPage: React.FC = () => {
  useBreadcrumbs([]);

  const [showSelectionFlyout, setShowSelectionFlyout] = useState(false);

  const { openFlyout: openAddSourceFlyout, flyout: addSourceFlyout } = useAddConnectorFlyout();

  const handleAddSource = useCallback(() => {
    setShowSelectionFlyout(true);
  }, []);

  const handleSourceSelected = useCallback(
    (source: Connector) => {
      setShowSelectionFlyout(false);
      // source.type is the stack connector actionTypeId (e.g., ".github") used by triggersActionsUi
      // source.id is the data source identifier (e.g., "github") used by our API
      openAddSourceFlyout(source.type, source.id);
    },
    [openAddSourceFlyout]
  );

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.dataSources.pageTitle', {
          defaultMessage: 'Sources',
        })}
        description={i18n.translate('xpack.dataSources.pageDescription', {
          defaultMessage: 'Connect your data to power your agents and indices.',
        })}
        rightSideItems={[
          <EuiButton
            key="addDataSource"
            iconType="plusInCircle"
            color="primary"
            fill
            onClick={handleAddSource}
            data-test-subj="addDataSourceButton"
          >
            {i18n.translate('xpack.dataSources.addSourceButton', {
              defaultMessage: 'Add data source',
            })}
          </EuiButton>,
        ]}
        css={({ euiTheme }) => ({
          backgroundColor: euiTheme.colors.backgroundBasePlain,
          borderBlockEnd: 'none',
        })}
      />

      <KibanaPageTemplate.Section>
        <SourcesList />
      </KibanaPageTemplate.Section>

      {showSelectionFlyout && (
        <SourceSelectionFlyout
          onClose={() => setShowSelectionFlyout(false)}
          onSelectSource={handleSourceSelected}
        />
      )}

      {addSourceFlyout}
    </KibanaPageTemplate>
  );
};
