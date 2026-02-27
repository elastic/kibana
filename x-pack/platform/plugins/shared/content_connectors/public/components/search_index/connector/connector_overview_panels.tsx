/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IngestionStatus } from '@kbn/search-connectors';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SEARCH_INDEX_TAB_PATH } from '../../routes';
import { isConnectorIndex } from '../../../utils/indices';

import { IndexViewLogic } from '../index_view_logic';
import { generateEncodedPath } from '../../shared/encode_path_params';
import { SearchIndexTabId } from '../../../../common/constants';
import { EuiLinkTo } from '../../shared/react_router_helpers';
import {
  ingestionStatusToColor,
  ingestionStatusToText,
} from '../../../utils/ingestion_status_helpers';

const StatusPanel: React.FC<{ ingestionStatus: IngestionStatus }> = ({ ingestionStatus }) => (
  <EuiPanel color={ingestionStatusToColor(ingestionStatus)} hasShadow={false} paddingSize="l">
    <EuiStat
      titleSize="s"
      description={i18n.translate('xpack.contentConnectors.connector.ingestionStatus.title', {
        defaultMessage: 'Ingestion status',
      })}
      title={ingestionStatusToText(ingestionStatus)}
    />
  </EuiPanel>
);

export const ConnectorOverviewPanels: React.FC = () => {
  const {
    services: { http },
  } = useKibana();
  const { ingestionStatus, index } = useValues(IndexViewLogic({ http }));

  return isConnectorIndex(index) ? (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiPanel color="primary" hasShadow={false} paddingSize="l">
          <EuiStat
            data-test-subj="entSearchContent-indexOverview-totalStats-documentCount"
            titleSize="s"
            description={i18n.translate(
              'xpack.contentConnectors.content.searchIndex.totalStats.documentCountCardLabel',
              {
                defaultMessage: 'Document count',
              }
            )}
            title={index.count}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem
        grow={1}
        data-test-subj="entSearchContent-indexOverview-connectorStats-ingestionStatus"
      >
        {ingestionStatus === IngestionStatus.INCOMPLETE ? (
          <EuiLinkTo
            to={generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
              indexName: index.name,
              tabId: SearchIndexTabId.CONFIGURATION,
            })}
          >
            <StatusPanel ingestionStatus={ingestionStatus} />
          </EuiLinkTo>
        ) : (
          <StatusPanel ingestionStatus={ingestionStatus} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <></>
  );
};
