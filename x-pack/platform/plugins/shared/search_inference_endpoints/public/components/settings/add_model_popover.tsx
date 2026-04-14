/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiIcon, EuiPopover, EuiSelectable } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { useQueryInferenceEndpoints } from '../../hooks/use_inference_endpoints';
import { getModelId } from '../../utils/get_model_id';
import {
  isEisEndpoint,
  getModelName,
  getModelCreator,
  getProviderKeyForCreator,
} from '../../utils/eis_utils';

interface AddModelPopoverProps {
  existingEndpointIds: string[];
  onAdd: (endpointId: string) => void;
  taskType?: string;
  panelWidth?: number;
}

export const AddModelPopover: React.FC<AddModelPopoverProps> = ({
  existingEndpointIds,
  onAdd,
  taskType,
  panelWidth,
}) => {
  const { data: inferenceEndpoints = [] } = useQueryInferenceEndpoints();
  const [isOpen, setIsOpen] = useState(false);

  const options: EuiSelectableOption[] = useMemo(() => {
    const existingSet = new Set(existingEndpointIds);
    const available = inferenceEndpoints.filter(
      (endpoint) =>
        !existingSet.has(endpoint.inference_id) && (!taskType || endpoint.task_type === taskType)
    );

    const modelToCount = inferenceEndpoints.reduce<Map<string, number>>((acc, ep) => {
      const modelId = getModelId(ep) ?? ep.inference_id;
      acc.set(modelId, (acc.get(modelId) ?? 0) + 1);
      return acc;
    }, new Map());

    return available.map((endpoint) => {
      const modelId = getModelId(endpoint) ?? endpoint.inference_id;
      const count = modelToCount.get(modelId) ?? 1;
      let icon: string;
      let baseName: string;
      if (isEisEndpoint(endpoint)) {
        const creator = getModelCreator(endpoint);
        const providerKey = getProviderKeyForCreator(creator);
        icon = (providerKey && SERVICE_PROVIDERS[providerKey]?.icon) ?? 'compute';
        baseName = getModelName(endpoint);
      } else {
        const provider = SERVICE_PROVIDERS[endpoint.service as ServiceProviderKeys];
        icon = provider?.icon ?? 'compute';
        baseName = modelId;
      }
      const label = count > 1 ? `${baseName} (${endpoint.inference_id})` : baseName;
      return {
        label,
        key: endpoint.inference_id,
        prepend: <EuiIcon type={icon} size="s" aria-hidden />,
      };
    });
  }, [inferenceEndpoints, existingEndpointIds, taskType]);

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.find((opt) => opt.checked === 'on');
      if (selected?.key) {
        onAdd(selected.key);
        setIsOpen(false);
      }
    },
    [onAdd]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          iconType="plusInCircle"
          onClick={() => setIsOpen((prev) => !prev)}
          size="s"
          data-test-subj="add-model-button"
          color="text"
        >
          <FormattedMessage
            id="xpack.searchInferenceEndpoints.settings.addModel"
            defaultMessage="Add a model"
          />
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downLeft"
      panelProps={
        panelWidth
          ? {
              css: css`
                width: ${panelWidth}px;
              `,
            }
          : undefined
      }
    >
      <EuiSelectable
        options={options}
        onChange={handleChange}
        singleSelection
        searchable
        data-test-subj="add-model-selectable"
        searchProps={{
          placeholder: i18n.translate('xpack.searchInferenceEndpoints.settings.addModel.search', {
            defaultMessage: 'Search models...',
          }),
          'data-test-subj': 'add-model-search',
        }}
        listProps={{ bordered: false, showIcons: false }}
        height={300}
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
