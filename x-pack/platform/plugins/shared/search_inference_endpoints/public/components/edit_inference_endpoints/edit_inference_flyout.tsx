/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceFlyoutWrapper } from '@kbn/inference-endpoint-ui-common/src/components/inference_flyout_wrapper';
import React, { useCallback } from 'react';
import type { InferenceEndpoint } from '@kbn/inference-endpoint-ui-common';
import { flattenObject } from '@kbn/object-utils';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { useKibana } from '../../hooks/use_kibana';
import { useQueryInferenceEndpoints } from '../../hooks/use_inference_endpoints';

interface EditInterfaceFlyoutProps {
  onFlyoutClose: () => void;
  selectedInferenceEndpoint: InferenceInferenceEndpointInfo;
}
export const EditInferenceFlyout: React.FC<EditInterfaceFlyoutProps> = ({
  onFlyoutClose,
  selectedInferenceEndpoint,
}) => {
  const {
    services: {
      http,
      notifications: { toasts },
      serverless,
    },
  } = useKibana();
  const { refetch } = useQueryInferenceEndpoints();
  const onEditSuccess = useCallback(() => {
    refetch();
  }, [refetch]);
  const onFocusReturn = useCallback(() => {
    // Defer focus until after any closing animations complete
    requestAnimationFrame(() => {
      const actionsButtonParent = document.getElementById(
        `${selectedInferenceEndpoint.inference_id}-actions`
      );
      if (actionsButtonParent) {
        const actionsButton = actionsButtonParent.querySelector('button');
        if (actionsButton) {
          actionsButton.focus();
        }
      }
    });
    return false;
  }, [selectedInferenceEndpoint.inference_id]);

  const inferenceEndpoint: InferenceEndpoint = {
    config: {
      inferenceId: selectedInferenceEndpoint.inference_id,
      taskType: selectedInferenceEndpoint.task_type,
      provider: selectedInferenceEndpoint.service,
      ...(selectedInferenceEndpoint.task_settings?.headers
        ? { headers: selectedInferenceEndpoint.task_settings?.headers }
        : {}),
      providerConfig: {
        ...flattenObject(selectedInferenceEndpoint.service_settings),
        // NOTE: The below is a workaround for anthropic max_tokens handling.
        // Anthropic is unique in that it requires max_tokens to be stored as part of the task_settings instead of the usual service_settings - which we populate the providerConfig from.
        ...(selectedInferenceEndpoint.task_settings?.max_tokens &&
        selectedInferenceEndpoint.service === ServiceProviderKeys.anthropic
          ? { max_tokens: selectedInferenceEndpoint.task_settings?.max_tokens }
          : {}),
      },
    },
    secrets: {
      providerSecrets: {},
    },
  };
  return (
    <InferenceFlyoutWrapper
      onFlyoutClose={onFlyoutClose}
      http={http}
      toasts={toasts}
      isEdit={true}
      enforceAdaptiveAllocations={!!serverless}
      onSubmitSuccess={onEditSuccess}
      inferenceEndpoint={inferenceEndpoint}
      focusTrapProps={{
        returnFocus: onFocusReturn,
      }}
    />
  );
};
