/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddableFlamegraph } from '@kbn/observability-shared-plugin/public';
import { BaseFlameGraph } from '@kbn/profiling-utils';
import { isEmpty } from 'lodash';
import React from 'react';
import { FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';

interface Props {
  data?: BaseFlameGraph;
  status: FETCH_STATUS;
}

export function FlamegraphChart({ data, status }: Props) {
  return (
    <>
      {status === FETCH_STATUS.SUCCESS &&
      (isEmpty(data) || data?.TotalSamples === 0) ? (
        <EuiEmptyPrompt
          titleSize="s"
          title={
            <div>
              {i18n.translate('xpack.apm.profiling.flamegraph.noDataFound', {
                defaultMessage: 'No data found',
              })}
            </div>
          }
        />
      ) : (
        <EmbeddableFlamegraph
          data={data}
          isLoading={isPending(status)}
          height="35vh"
        />
      )}
    </>
  );
}
