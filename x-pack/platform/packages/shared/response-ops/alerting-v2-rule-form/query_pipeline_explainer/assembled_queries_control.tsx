/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from '../form/types';
import { QueryPipelineExplainer } from './query_pipeline_explainer';

/**
 * Secondary create-context entry: opens the config-aware query pipeline explainer.
 */
export const AssembledQueriesControl = (): React.ReactElement => {
  const [isOpen, setIsOpen] = useState(false);
  const { watch } = useFormContext<FormValues>();
  const query = watch('query');
  const recovery = watch('recovery');
  const noData = watch('noData');
  const hasBase = Boolean(query?.base?.trim());

  return (
    <>
      <EuiButtonEmpty
        size="xs"
        flush="right"
        iconType="info"
        onClick={() => setIsOpen(true)}
        data-test-subj="assembledQueriesOpen"
      >
        <FormattedMessage
          id="xpack.alertingV2.queryPipelineExplainer.assembledQueriesButton"
          defaultMessage="How this works?"
        />
      </EuiButtonEmpty>

      {isOpen ? (
        <EuiModal
          onClose={() => setIsOpen(false)}
          style={{ width: 720 }}
          data-test-subj="assembledQueriesModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {i18n.translate('xpack.alertingV2.queryPipelineExplainer.assembledQueriesTitle', {
                defaultMessage: 'Assembled queries',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {!hasBase ? (
              <>
                <EuiText size="s" color="subdued">
                  <p data-test-subj="assembledQueriesIncompleteHint">
                    <FormattedMessage
                      id="xpack.alertingV2.queryPipelineExplainer.completeQueryHint"
                      defaultMessage="Complete the query to preview the assembled pipeline. Showing a sample until then."
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <QueryPipelineExplainer
                  demo
                  forceExpanded
                  data-test-subj="assembledQueriesExplainerDemo"
                />
              </>
            ) : (
              <QueryPipelineExplainer
                query={query}
                recovery={recovery}
                noData={noData}
                forceExpanded
                data-test-subj="assembledQueriesExplainer"
              />
            )}
          </EuiModalBody>
        </EuiModal>
      ) : null}
    </>
  );
};
