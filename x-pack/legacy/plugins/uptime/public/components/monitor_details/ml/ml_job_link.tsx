/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import url from 'url';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import rison, { RisonValue } from 'rison-node';
import { ML_JOB_ID } from '../../../../common/constants';

interface Props {
  fill?: boolean;
  monitorId: string;
  basePath: string;
}

export const MLJobLink: React.FC<Props> = ({ fill, basePath, monitorId, children }) => {
  // const { dateRangeStart, dateRangeEnd } = useUrlParams()[0]();

  const query = {
    ml: { jobIds: [ML_JOB_ID] },
    refreshInterval: { pause: true, value: 0 },
    // time: { from: dateRangeStart, to: dateRangeEnd },
  };

  const queryParams = {
    mlExplorerFilter: {
      filterActive: true,
      filteredFields: ['monitor.id', monitorId],
      influencersFilterQuery: {
        bool: {
          minimum_should_match: 1,
          should: [
            {
              match_phrase: {
                'monitor.id': monitorId,
              },
            },
          ],
        },
      },
      queryString: `monitor.id:${monitorId}`,
    },
    mlExplorerSwimlane: {
      viewByFieldName: 'monitor.id',
    },
  };

  const path = '/explorer';

  const href = url.format({
    pathname: basePath + '/app/ml',
    hash:
      `${path}?_g=${rison.encode(query as RisonValue)}` +
      (monitorId ? `&_a=${rison.encode(queryParams as RisonValue)}` : ''),
  });

  return fill ? (
    <EuiButton size="s" children={children} fill={fill} href={href} target="_blank" />
  ) : (
    <EuiButtonEmpty children={children} size="s" href={href} target="_blank" />
  );
};
