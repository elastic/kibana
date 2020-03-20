/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { getSources } from '../../../layers/sources/source_registry';
import { EuiTitle, EuiSpacer, EuiCard, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';

export function SourceSelect({ updateSourceSelection }) {
  const sourceCards = getSources().map(sourceRegistryEntry => {
    const icon = sourceRegistryEntry.icon ? (
      <EuiIcon type={sourceRegistryEntry.icon} size="l" />
    ) : null;

    return (
      <Fragment key={sourceRegistryEntry.id}>
        <EuiSpacer size="s" />
        <EuiCard
          className="mapLayerAddpanel__card"
          title={sourceRegistryEntry.title}
          icon={icon}
          onClick={() =>
            updateSourceSelection({
              sourceId: sourceRegistryEntry.id,
              isIndexingSource: !!sourceRegistryEntry.isIndexingSource,
            })
          }
          description={sourceRegistryEntry.description}
          layout="horizontal"
          data-test-subj={_.camelCase(sourceRegistryEntry.title)}
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
