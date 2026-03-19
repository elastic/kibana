/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import React from 'react';
import * as i18n from '../../common/translations';
import { PLUGIN_TITLE } from '../../common/constants';
import { docLinks } from '../../common/doc_links';
import { useTrainedModelPageUrl } from '../hooks/use_trained_model_page_url';

interface InferenceEndpointsHeaderProps {
  onFlyoutOpen: () => void;
}
export const InferenceEndpointsHeader: React.FC<InferenceEndpointsHeaderProps> = ({
  onFlyoutOpen,
}) => {
  const trainedModelPageUrl = useTrainedModelPageUrl();

  return (
    <EuiPageTemplate.Header
      data-test-subj="allInferenceEndpointsPage"
      pageTitle={PLUGIN_TITLE}
      description={i18n.MANAGE_INFERENCE_ENDPOINTS_LABEL}
      bottomBorder={true}
      rightSideItems={[
        <EuiButton
          iconType="plusInCircle"
          fill
          iconSize="m"
          data-test-subj="add-inference-endpoint-header-button"
          onClick={onFlyoutOpen}
        >
          {i18n.ADD_ENDPOINT_LABEL}
        </EuiButton>,
        <EuiButtonEmpty
          aria-label={i18n.API_DOCUMENTATION_LINK}
          iconType="popout"
          iconSide="right"
          iconSize="s"
          flush="both"
          target="_blank"
          data-test-subj="api-documentation"
          href={docLinks.createInferenceEndpoint}
        >
          {i18n.API_DOCUMENTATION_LINK}
        </EuiButtonEmpty>,
        <EuiButtonEmpty
          aria-label={i18n.VIEW_YOUR_MODELS_LINK}
          href={trainedModelPageUrl}
          iconType="popout"
          iconSide="right"
          iconSize="s"
          flush="both"
          target="_blank"
          data-test-subj="view-your-models"
        >
          {i18n.VIEW_YOUR_MODELS_LINK}
        </EuiButtonEmpty>,
        <EuiButtonEmpty
          aria-label={i18n.EIS_DOCUMENTATION_LINK}
          href={docLinks.elasticInferenceService}
          iconType="popout"
          iconSide="right"
          iconSize="s"
          flush="both"
          target="_blank"
          data-test-subj="eis-documentation"
        >
          {i18n.EIS_DOCUMENTATION_LINK}
        </EuiButtonEmpty>,
      ]}
    />
  );
};
