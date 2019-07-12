/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ALL_SOURCES } from '../../../shared/layers/sources/all_sources';
import {
  EuiTitle,
  EuiSpacer,
  EuiCard,
  EuiIcon,
  EuiBetaBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';

export function SourceSelect({
  updateSourceSelection
}) {

  const sourceCards = ALL_SOURCES.map(Source => {
    const icon = Source.icon
      ? <EuiIcon type={Source.icon} size="l" />
      : null;

    const sourceTitle = Source.isBeta
      ? <div><span>{Source.title}</span>{generateBetaBadge(Source.title)}</div>
      : Source.title;

    return (
      <Fragment key={Source.type}>
        <EuiSpacer size="s" />
        <EuiCard
          className="mapLayerAddpanel__card"
          title={sourceTitle}
          icon={icon}
          onClick={() => updateSourceSelection(
            { type: Source.type, isIndexingSource: Source.isIndexingSource })
          }
          description={Source.description}
          layout="horizontal"
          data-test-subj={_.camelCase(Source.title)}
        />
      </Fragment>
    );
  });

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.maps.addLayerPanel.chooseDataSourceTitle"
            defaultMessage="Choose data source"
          />
        </h2>
      </EuiTitle>
      {sourceCards}
    </Fragment>
  );
}

function generateBetaBadge(appTitle) {
  return (
    <EuiBetaBadge
      label="Beta"
      tooltipContent={
        i18n.translate('xpack.maps.sourceSelect.betaMessageBadge', {
          defaultMessage:
            `"{appTitle}" is still in beta. Please help us improve by reporting issues or bugs in the Kibana repo.`,
          values: { appTitle }
        })
      }
    />
  );
}
