/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiCode, EuiText, EuiHorizontalRule } from '@elastic/eui';
import { ChangesNeeded } from '../../blurbs';
import { FormattedMessage } from '@kbn/i18n/react';

export function ExplainPluginEnabled({ reason }) {
  const { context, property, data } = reason;
  return (
    <Fragment>
      <ChangesNeeded />
      <EuiHorizontalRule size="half" />
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.monitoring.noData.explanations.pluginEnabledDescription"
            defaultMessage="We checked the {context} settings and found that {property}
            is set to {data} set, which disables monitoring.
            Removing the {monitoringEnableFalse} setting
            from your configuration will put the default into effect and enable Monitoring."
            values={{
              context,
              property: <EuiCode>{property}</EuiCode>,
              data: <EuiCode>{data}</EuiCode>,
              monitoringEnableFalse: <EuiCode>xpack.monitoring.enabled: false</EuiCode>,
            }}
          />
        </p>
      </EuiText>
    </Fragment>
  );
}

ExplainPluginEnabled.propTypes = {
  reason: PropTypes.object.isRequired,
};
