/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import { EuiButtonGroup, EuiFlexGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useController, useFormContext } from 'react-hook-form';
import type { McpLogoSelectValue } from './mcp_logo_select';
import { McpLogoSelect } from './mcp_logo_select';
import type { McpLogoUploadValue } from './mcp_logo_upload';
import { McpLogoUpload } from './mcp_logo_upload';
import type { ClientLogo, McpClientFormData, SelectClientLogo, UploadClientLogo } from './types';
import { McpLogoPickerTab, NO_CLIENT_LOGO } from './types';

interface CachedVariants {
  [McpLogoPickerTab.SELECT]: SelectClientLogo | null;
  [McpLogoPickerTab.UPLOAD]: UploadClientLogo | null;
}

const isMcpLogoPickerTab = (value: string): value is McpLogoPickerTab =>
  value === McpLogoPickerTab.SELECT || value === McpLogoPickerTab.UPLOAD;

const initialTab = (value: ClientLogo): McpLogoPickerTab =>
  value.type === 'upload' ? McpLogoPickerTab.UPLOAD : McpLogoPickerTab.SELECT;

const initialCache = (value: ClientLogo): CachedVariants => ({
  [McpLogoPickerTab.SELECT]: value.type === 'select' ? value : null,
  [McpLogoPickerTab.UPLOAD]: value.type === 'upload' ? value : null,
});

const logoPickerButtonsStyles = css`
  max-inline-size: 300px;
`;

export const McpLogoPicker = () => {
  const {
    field: { value, onChange },
  } = useController<McpClientFormData, 'clientLogo'>({ name: 'clientLogo' });
  const { clearErrors } = useFormContext<McpClientFormData>();

  const [selectedTab, setSelectedTab] = useState<McpLogoPickerTab>(() => initialTab(value));
  const cacheRef = useRef<CachedVariants>(initialCache(value));

  const handleTabChange = useCallback(
    (id: string) => {
      const nextTab = isMcpLogoPickerTab(id) ? id : McpLogoPickerTab.SELECT;
      if (nextTab === selectedTab) return;
      clearErrors('clientLogo');
      setSelectedTab(nextTab);
      const restored = cacheRef.current[nextTab];
      onChange(restored ?? NO_CLIENT_LOGO);
    },
    [selectedTab, clearErrors, onChange]
  );

  const handleSelectChange = useCallback(
    (selectValue: McpLogoSelectValue | null) => {
      const variant: SelectClientLogo | null = selectValue
        ? { type: 'select', id: selectValue.id, dataUrl: selectValue.dataUrl }
        : null;
      cacheRef.current[McpLogoPickerTab.SELECT] = variant;
      onChange(variant ?? NO_CLIENT_LOGO);
    },
    [onChange]
  );

  const handleUploadChange = useCallback(
    (uploadValue: McpLogoUploadValue | null) => {
      const variant: UploadClientLogo | null = uploadValue
        ? {
            type: 'upload',
            file: uploadValue.file,
            dataUrl: uploadValue.dataUrl,
          }
        : null;
      cacheRef.current[McpLogoPickerTab.UPLOAD] = variant;
      onChange(variant ?? NO_CLIENT_LOGO);
    },
    [onChange]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiButtonGroup
        css={logoPickerButtonsStyles}
        legend={i18n.translate('xpack.agentBuilder.mcpClients.form.logoButtonLegend', {
          defaultMessage: 'Select or upload a logo',
        })}
        options={[
          {
            id: McpLogoPickerTab.SELECT,
            label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoButtonSelect', {
              defaultMessage: 'Select logo',
            }),
          },
          {
            id: McpLogoPickerTab.UPLOAD,
            label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoButtonUpload', {
              defaultMessage: 'Upload logo',
            }),
          },
        ]}
        idSelected={selectedTab}
        onChange={handleTabChange}
        buttonSize="compressed"
        isFullWidth
      />
      {selectedTab === McpLogoPickerTab.SELECT && (
        <McpLogoSelect
          value={value.type === 'select' ? value : null}
          onChange={handleSelectChange}
        />
      )}
      {selectedTab === McpLogoPickerTab.UPLOAD && (
        <McpLogoUpload
          value={value.type === 'upload' ? value : null}
          onChange={handleUploadChange}
        />
      )}
    </EuiFlexGroup>
  );
};
