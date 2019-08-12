/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCode,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { ChangesNeeded } from '../../blurbs';
import { FormattedMessage } from '@kbn/i18n/react';

export function ExplainExporters({ context, property, data }) {
  return (
    <Fragment>
      <ChangesNeeded />
      <EuiHorizontalRule size="half" />
      <EuiText className="eui-textLeft">
        <p>
          <FormattedMessage
            id="xpack.monitoring.noData.explanations.exportersDescription"
            defaultMessage="We checked the {context} settings for
            {property}, and found the reason: {data}."
            values={{
              context: (<EuiCode>{context}</EuiCode>),
              property: (<EuiCode>{property}</EuiCode>),
              data: (<EuiCode>{data}</EuiCode>)
            }}
          />
        </p>

        <p>
          <FormattedMessage
            id="xpack.monitoring.noData.explanations.exporters.problemWithConfigDescription"
            defaultMessage="Using monitoring exporters to ship the monitoring data to a remote
            monitoring cluster is highly recommended as it keeps the integrity of
            the monitoring data safe no matter what the state of the production
            cluster. However, as this instance of Kibana could not find any
            monitoring data, there seems to be a problem with the {property} configuration,
            or the {monitoringEs} settings in {kibanaConfig}."
            values={{
              property: (<EuiCode>{property}</EuiCode>),
              monitoringEs: (<EuiCode>xpack.monitoring.elasticsearch</EuiCode>),
              kibanaConfig: (<EuiCode>kibana.yml</EuiCode>)
            }}
          />
        </p>

        <p>
          <FormattedMessage
            id="xpack.monitoring.noData.explanations.exporters.checkConfigDescription"
            defaultMessage="Check that the intended exporters are enabled for sending statistics to
            the monitoring cluster, and that the monitoring cluster host matches the {monitoringEs}
            setting in {kibanaConfig} to see monitoring data in this instance of Kibana."
            values={{
              monitoringEs: (<EuiCode>xpack.monitoring.elasticsearch</EuiCode>),
              kibanaConfig: (<EuiCode>kibana.yml</EuiCode>)
            }}
          />
        </p>
      </EuiText>
    </Fragment>
  );
}

ExplainExporters.propTypes = {
  context: PropTypes.string.isRequired,
  property: PropTypes.string.isRequired,
  data: PropTypes.string.isRequired
};
