/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DFAModelItem } from '../../../common/types/trained_models';
import { TestPipeline } from '../components/ml_inference/components/test_pipeline';
import { getInitialState } from '../components/ml_inference/state';
import { TEST_PIPELINE_MODE } from '../components/ml_inference/types';

interface Props {
  model: DFAModelItem;
  onClose: () => void;
}

export const TestDfaModelsFlyout: FC<Props> = ({ model, onClose }) => {
  const sourceIndex = useMemo(
    () =>
      Array.isArray(model.metadata?.analytics_config.source.index)
        ? model.metadata?.analytics_config.source.index.join()
        : model.metadata?.analytics_config.source.index,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model?.model_id]
  );

  const state = useMemo(
    () => getInitialState(model),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model?.model_id]
  );
  return (
    <EuiFlyout size="l" onClose={onClose} data-test-subj="mlTestModelsFlyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.ml.trainedModels.testDfaModelsFlyout.headerLabel"
              defaultMessage="Test trained model"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiTitle size="xs">
          <h4>{model.model_id}</h4>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <TestPipeline
          state={state}
          sourceIndex={sourceIndex}
          mode={TEST_PIPELINE_MODE.STAND_ALONE}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
