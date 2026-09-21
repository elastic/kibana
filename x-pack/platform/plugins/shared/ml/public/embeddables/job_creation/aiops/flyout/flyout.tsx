/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiSkeletonText,
} from '@elastic/eui';

import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '@kbn/es-query';
import { loadMlServerInfo } from '../../../../application/services/ml_server_info';
import { CreateJob } from './create_job';
import { useMlFromLensKibanaContext } from '../../common/context';

interface Props {
  dataView: DataView;
  field: DataViewField;
  query: QueryDslQueryContainer;
  timeRange: TimeRange;
  onClose: () => void;
}

export const CreateCategorizationJobFlyout: FC<Props> = ({
  onClose,
  dataView,
  field,
  query,
  timeRange,
}) => {
  const {
    services: {
      mlServices: { mlApi },
    },
  } = useMlFromLensKibanaContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchServerInfo() {
      setIsLoading(true);
      try {
        await loadMlServerInfo(mlApi);
        if (cancelled) {
          return;
        }
        setIsLoading(false);
      } catch (error) {
        if (cancelled) {
          return;
        }
        // eslint-disable-next-line no-console
        console.error('ML server info could not be loaded', error);
        onClose();
      }
    }

    void fetchServerInfo();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id="ml-flyout-layer-title">
            <FormattedMessage
              id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.title"
              defaultMessage="Create anomaly detection job"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.secondTitle"
            defaultMessage="Create a categorization job for {field}"
            values={{ field: field.name }}
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSkeletonText lines={4} isLoading={isLoading}>
          <CreateJob dataView={dataView} field={field} query={query} timeRange={timeRange} />
        </EuiSkeletonText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ml.embeddables.newJobFromPatternAnalysisFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
