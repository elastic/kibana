/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiLink
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const Reason = ({ reason }) => {
  let title;
  let message;

  if (false === reason.indexPatternExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noIndexPatternTitle', {
      defaultMessage: 'No log data found'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noIndexPatternMessage"
        defaultMessage="Set up {link}, then configure your Elasticsearch output to your monitoring cluster."
        values={{
          link: (
            <EuiLink href="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-installation.html">
              {i18n.translate('xpack.monitoring.logs.reason.noIndexPatternLink', {
                defaultMessage: 'Filebeat'
              })}
            </EuiLink>
          )
        }}
      />
    );
  }
  else if (false === reason.indexPatternInTimeRangeExists || (false === reason.typeExists && reason.typeExistsAtAnyTime)) {
    title = i18n.translate('xpack.monitoring.logs.reason.noIndexPatternInTimePeriodTitle', {
      defaultMessage: 'No logs for the selected time'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noIndexPatternInTimePeriodMessage"
        defaultMessage="Use the time filter to adjust your timeframe."
      />
    );
  }
  else if (false === reason.typeExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noTypeTitle', {
      defaultMessage: 'No logs for Elasticsearch'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noTypeMessage"
        defaultMessage="Follow {link} to set up Elasticsearch."
        values={{
          link: (
            <EuiLink href="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-elasticsearch.html">
              {i18n.translate('xpack.monitoring.logs.reason.noTypeLink', {
                defaultMessage: 'these directions'
              })}
            </EuiLink>
          )
        }}
      />
    );
  }
  else if (false === reason.clusterExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noClusterTitle', {
      defaultMessage: 'No logs for this cluster'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noClusterMessage"
        defaultMessage="Check that your {link} is correct."
        values={{
          link: (
            <EuiLink href="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-installation.html">
              {i18n.translate('xpack.monitoring.logs.reason.noClusterLink', {
                defaultMessage: 'setup'
              })}
            </EuiLink>
          )
        }}
      />
    );
  }
  else if (false === reason.nodeExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noNodeTitle', {
      defaultMessage: 'No logs for this Elasticsearch node'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noNodeMessage"
        defaultMessage="Check that your {link} is correct."
        values={{
          link: (
            <EuiLink href="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-installation.html">
              {i18n.translate('xpack.monitoring.logs.reason.noNodeLink', {
                defaultMessage: 'setup'
              })}
            </EuiLink>
          )
        }}
      />
    );
  }
  else if (false === reason.indexExists) {
    title = i18n.translate('xpack.monitoring.logs.reason.noIndexTitle', {
      defaultMessage: 'No logs for this index'
    });
    message = (
      <FormattedMessage
        id="xpack.monitoring.logs.reason.noIndexMessage"
        defaultMessage="We found logs, but none for this index. If this problem continues, check that your {link} is correct."
        values={{
          link: (
            <EuiLink href="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-installation.html">
              {i18n.translate('xpack.monitoring.logs.reason.noNodeLink', {
                defaultMessage: 'setup'
              })}
            </EuiLink>
          )
        }}
      />
    );
  }

  return (
    <EuiCallOut
      title={title}
      color="warning"
      iconType="help"
    >
      <p>{message}</p>
    </EuiCallOut>
  );
};
