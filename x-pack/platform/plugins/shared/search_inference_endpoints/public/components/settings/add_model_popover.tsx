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
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { useEndpointInfo } from '../../hooks/use_endpoint_info';

const popoverStyle = css({ width: 400 });

const isElasticService = (service: string): boolean =>
  service === ServiceProviderKeys.elastic || service === ServiceProviderKeys.elasticsearch;

const ELASTIC_INFERENCE_SERVICE_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.addModel.elasticGroup',
  { defaultMessage: 'Elastic Inference Service' }
);

const NON_MANAGED_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.addModel.nonManagedGroup',
  { defaultMessage: 'Non-managed' }
);

interface AddModelPopoverProps {
  existingEndpointIds: string[];
  onAdd: (endpointId: string) => void;
}

export const AddModelPopover: React.FC<AddModelPopoverProps> = ({ existingEndpointIds, onAdd }) => {
  const { inferenceEndpoints, endpointInfoMap } = useEndpointInfo();
  const [isOpen, setIsOpen] = useState(false);

  const options: EuiSelectableOption[] = useMemo(() => {
    const existingSet = new Set(existingEndpointIds);
    const elasticGroup: EuiSelectableOption[] = [];
    const nonManagedGroup: EuiSelectableOption[] = [];

    inferenceEndpoints.forEach((endpoint) => {
      if (existingSet.has(endpoint.inference_id)) return;

      const info = endpointInfoMap.get(endpoint.inference_id);
      const option: EuiSelectableOption = {
        label: info?.label ?? endpoint.inference_id,
        key: endpoint.inference_id,
        prepend: <EuiIcon type={info?.icon ?? 'compute'} size="s" aria-hidden />,
      };

      if (isElasticService(endpoint.service)) {
        elasticGroup.push(option);
      } else {
        nonManagedGroup.push(option);
      }
    });

    const result: EuiSelectableOption[] = [];

    if (elasticGroup.length > 0) {
      result.push({
        label: ELASTIC_INFERENCE_SERVICE_LABEL,
        isGroupLabel: true,
        key: 'group-elastic',
      });
      result.push(...elasticGroup);
    }

    if (nonManagedGroup.length > 0) {
      result.push({ label: NON_MANAGED_LABEL, isGroupLabel: true, key: 'group-non-managed' });
      result.push(...nonManagedGroup);
    }

    return result;
  }, [inferenceEndpoints, existingEndpointIds, endpointInfoMap]);

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.find((opt) => opt.checked === 'on' && !opt.isGroupLabel);
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
    >
      <EuiSelectable
        css={popoverStyle}
        options={options}
        onChange={handleChange}
        singleSelection
        searchable
        searchProps={{
          placeholder: i18n.translate('xpack.searchInferenceEndpoints.settings.addModel.search', {
            defaultMessage: 'Search models...',
          }),
          'data-test-subj': 'add-model-search',
        }}
        listProps={{ bordered: false }}
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
