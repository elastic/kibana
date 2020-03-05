/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import url from 'url';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import rison, { RisonValue } from 'rison-node';
import { ML_JOB_ID } from '../../../../common/constants';
import { UptimeSettingsContext } from '../../../contexts';

interface Props {
  fill?: boolean;
}

export const MLJobLink: React.FC<Props> = ({ fill, children }) => {
  const { basePath } = useContext(UptimeSettingsContext);

  const query = {
    ml: { jobIds: [ML_JOB_ID] },
    refreshInterval: { pause: true, value: 0 },
    time: { from: 'now-24h', to: 'now' },
  };

  const path = '/explorer';

  const href = url.format({
    pathname: basePath + '/app/ml',
    hash: `${path}?_g=${rison.encode(query as RisonValue)}`,
  });

  return fill ? (
    <EuiButton size="s" children={children} fill={fill} href={href} target="_blank" />
  ) : (
    <EuiButtonEmpty children={children} size="s" href={href} target="_blank" />
  );
};
