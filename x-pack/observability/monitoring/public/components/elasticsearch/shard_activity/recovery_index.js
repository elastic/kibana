/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { Snapshot } from './snapshot';
import { FormattedMessage } from '@kbn/i18n-react';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';

export const RecoveryIndex = (props) => {
  const { name, shard, relocationType } = props;

  return (
    <div>
      <EuiLink href={getSafeForExternalLink(`#/elasticsearch/indices/${name}`)}>{name}</EuiLink>
      <br />
      <FormattedMessage
        id="xpack.monitoring.elasticsearch.shardActivity.recoveryIndex.shardDescription"
        defaultMessage="Shard: {shard}"
        values={{
          shard,
        }}
      />
      <br />
      <FormattedMessage
        id="xpack.monitoring.elasticsearch.shardActivity.recoveryIndex.recoveryTypeDescription"
        defaultMessage="Recovery type: {relocationType}"
        values={{
          relocationType,
        }}
      />
      <div>
        <Snapshot {...props} />
      </div>
    </div>
  );
};
