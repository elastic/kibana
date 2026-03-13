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

const popoverStyle = css({ width: 400 });

interface AddModelPopoverProps {
  existingEndpointIds: string[];
  onAdd: (endpointId: string) => void;
}

export const AddModelPopover: React.FC<AddModelPopoverProps> = ({ existingEndpointIds, onAdd }) => {
  const { data: inferenceEndpoints = [] } = useQueryInferenceEndpoints();
  const [isOpen, setIsOpen] = useState(false);

  const options: EuiSelectableOption[] = useMemo(() => {
    const existingSet = new Set(existingEndpointIds);

    return inferenceEndpoints
      .filter((endpoint) => !existingSet.has(endpoint.inference_id))
      .map((endpoint) => {
        const icon = SERVICE_PROVIDERS[endpoint.service as ServiceProviderKeys]?.icon ?? 'compute';
        return {
          label: endpoint.inference_id,
          key: endpoint.inference_id,
          prepend: <EuiIcon type={icon} size="s" aria-hidden />,
        };
      });
  }, [inferenceEndpoints, existingEndpointIds]);

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
