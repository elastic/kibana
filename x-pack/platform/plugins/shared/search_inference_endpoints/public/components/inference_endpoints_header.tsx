/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useMemo } from 'react';
import * as i18n from '../../common/translations';
import { PLUGIN_TITLE, EXTERNAL_INFERENCE_TITLE } from '../../common/constants';
import { docLinks } from '../../common/doc_links';
import { useKibana } from '../hooks/use_kibana';
import { isElasticInferenceServiceEnabled } from '../feature_flag';

interface InferenceEndpointsHeaderProps {
  onFlyoutOpen: () => void;
}
export const InferenceEndpointsHeader: React.FC<InferenceEndpointsHeaderProps> = ({
  onFlyoutOpen,
}) => {
  const {
    services: { application, uiSettings },
  } = useKibana();

  const isEisEnabled = isElasticInferenceServiceEnabled(uiSettings);

  const rightSideItems = useMemo(() => {
    if (isEisEnabled) {
      return [
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLink
              target="_blank"
              data-test-subj="api-documentation"
              href={docLinks.createInferenceEndpoint}
              external
            >
              {i18n.API_DOCUMENTATION_LINK}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="plusInCircle"
              fill
              data-test-subj="add-inference-endpoint-header-button"
              onClick={onFlyoutOpen}
            >
              {i18n.ADD_ENDPOINT_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>,
      ];
    }

    return [
      <EuiButton
        iconType="plusInCircle"
        fill
        data-test-subj="add-inference-endpoint-header-button"
        onClick={onFlyoutOpen}
      >
        {i18n.ADD_ENDPOINT_LABEL}
      </EuiButton>,
      <EuiLink
        target="_blank"
        data-test-subj="api-documentation"
        href={docLinks.createInferenceEndpoint}
        external
      >
        {i18n.API_DOCUMENTATION_LINK}
      </EuiLink>,
      <EuiLink
        onClick={() => application.navigateToApp('ml', { path: 'trained_models' })}
        data-test-subj="view-your-models"
      >
        {i18n.VIEW_YOUR_MODELS_LINK}
      </EuiLink>,
      <EuiLink
        href={docLinks.elasticInferenceService}
        target="_blank"
        data-test-subj="eis-documentation"
        external
      >
        {i18n.EIS_DOCUMENTATION_LINK}
      </EuiLink>,
    ];
  }, [isEisEnabled, onFlyoutOpen, application]);

  return (
    <EuiPageTemplate.Header
      data-test-subj="allInferenceEndpointsPage"
      pageTitle={isEisEnabled ? EXTERNAL_INFERENCE_TITLE : PLUGIN_TITLE}
      description={i18n.MANAGE_INFERENCE_ENDPOINTS_LABEL}
      bottomBorder={true}
      rightSideItems={rightSideItems}
    />
  );
};
