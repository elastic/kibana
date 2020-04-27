/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiExpression } from '@elastic/eui';
import * as labels from '../translations';
import { useGetUrlParams } from '../../../../hooks';

interface Props {
  selectedPorts: string[];
}

export const FiltersExpressionsSelect: React.FC<Props> = ({ selectedPort }) => {
  const { filters } = useGetUrlParams();

  const filterKueries = new Map<string, string[]>(
    JSON.parse(filters === '' ? '[]' : filters ?? '[]')
  );
  const tags = filterKueries.get('tags');
  const ports = filterKueries.get('url.port');
  const scheme = filterKueries.get('monitor.type');

  return (
    <>
      <div>
        <EuiExpression
          aria-label={'ariaLabel'}
          color={'secondary'}
          data-test-subj={''}
          description={ports ? 'Using port' : 'Using any port'}
          value={ports}
        />
      </div>
      <div>
        <EuiExpression
          aria-label={'ariaLabel'}
          color={'secondary'}
          data-test-subj={''}
          description={tags ? 'With tag' : 'With any tag'}
          value={tags}
        />
      </div>
      <div>
        <EuiExpression
          aria-label={'ariaLabel'}
          color={'secondary'}
          data-test-subj={''}
          description={scheme ? 'Of type' : 'Of any type'}
          value={scheme}
        />
      </div>
    </>
  );
};
