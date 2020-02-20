/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, FunctionComponent } from 'react';

import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { EnrichedDeprecationInfo } from '../../../../../../../server/np_ready/lib/es_migration_apis';

export const DeprecationCountSummary: FunctionComponent<{
  deprecations: EnrichedDeprecationInfo[];
  allDeprecations: EnrichedDeprecationInfo[];
}> = ({ deprecations, allDeprecations }) => (
  <EuiText size="s">
    {allDeprecations.length ? (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.numDeprecationsShownLabel"
        defaultMessage="Showing {numShown} of {total}"
        values={{ numShown: deprecations.length, total: allDeprecations.length }}
      />
    ) : (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.noDeprecationsLabel"
        defaultMessage="No deprecations"
      />
    )}
    {deprecations.length !== allDeprecations.length && (
      <Fragment>
        {'. '}
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.changeFiltersShowMoreLabel"
          description="Explains how to show all deprecations if there are more available."
          defaultMessage="Change filter to show more."
        />
      </Fragment>
    )}
  </EuiText>
);
