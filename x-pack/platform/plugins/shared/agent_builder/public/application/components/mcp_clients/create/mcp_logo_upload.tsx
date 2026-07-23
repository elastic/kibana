/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFilePicker, EuiFlexGroup, EuiFormHelpText, EuiText } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { css } from '@emotion/react';
import {
  OAUTH_CLIENT_LOGO_MAX_DATA_LENGTH,
  OAUTH_CLIENT_LOGO_MEDIA_TYPES,
  isOAuthClientLogoMediaType,
} from '@kbn/security-plugin/common/oauth';
import { useFormContext } from 'react-hook-form';
import { McpClientLogo } from '@kbn/agent-builder-browser';
import { readBlobAsDataUrl } from '../../../utils/data_url';
import { labels } from '../../../utils/i18n';
import { toClientLogoPayload } from './mcp_client_transform';
import type { McpClientFormData } from './types';

export interface McpLogoUploadValue {
  file: File;
  dataUrl: string;
}

export interface McpLogoUploadProps {
  value: McpLogoUploadValue | null;
  onChange: (value: McpLogoUploadValue | null) => void;
}

const ACCEPT_ATTRIBUTE = OAUTH_CLIENT_LOGO_MEDIA_TYPES.join(',');

// Largest raw byte size that, after base64 encoding, still fits within the
// server-side cap on `client_logo.data`. Base64 inflates 3 raw bytes to
// 4 characters, so the equivalent raw cap is `length / 4 * 3`.
export const MAX_LOGO_FILE_SIZE_BYTES = (OAUTH_CLIENT_LOGO_MAX_DATA_LENGTH / 4) * 3;

const formatBytes = (bytes: number) => numeral(bytes).format('0.[0] b');
const FORMATTED_MAX_LOGO_FILE_SIZE = formatBytes(MAX_LOGO_FILE_SIZE_BYTES);

const previewLabelStyles = ({ euiTheme }: UseEuiTheme) => css`
  font-weight: ${euiTheme.font.weight.semiBold};
`;

export const McpLogoUpload = ({ value, onChange }: McpLogoUploadProps) => {
  const {
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<McpClientFormData>();

  const isInvalid = errors.clientLogo !== undefined;

  const setClientLogoError = useCallback(
    (message: string) => {
      setError('clientLogo', { type: 'manual', message });
    },
    [setError]
  );

  const cachedFiles = useMemo(() => (value ? [value.file] : null), [value]);
  const handleChange = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        clearErrors('clientLogo');
        onChange(null);
        return;
      }

      const [file] = files;

      if (!isOAuthClientLogoMediaType(file.type)) {
        setClientLogoError(labels.tools.mcpClients.form.uploadLogoInvalidType);
        onChange(null);
        return;
      }

      if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
        setClientLogoError(
          labels.tools.mcpClients.form.uploadLogoTooLarge(
            FORMATTED_MAX_LOGO_FILE_SIZE,
            formatBytes(file.size)
          )
        );
        onChange(null);
        return;
      }

      try {
        const dataUrl = await readBlobAsDataUrl(file);
        clearErrors('clientLogo');
        onChange({ file, dataUrl });
      } catch {
        setClientLogoError(labels.tools.mcpClients.form.uploadLogoReadError);
        onChange(null);
      }
    },
    [onChange, setClientLogoError, clearErrors]
  );

  const logoPreview = useMemo(() => {
    if (!value) {
      return null;
    }
    const clientLogo = toClientLogoPayload({ type: 'upload', ...value });
    if (!clientLogo) {
      return null;
    }
    return <McpClientLogo size="l" clientLogo={clientLogo} />;
  }, [value]);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      {value && (
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiText size="xs" css={previewLabelStyles}>
            {labels.tools.mcpClients.form.logoUploadPreview}
          </EuiText>
          {logoPreview}
        </EuiFlexGroup>
      )}
      <EuiFilePicker
        data-test-subj="mcpClientLogoUpload"
        initialPromptText={labels.tools.mcpClients.form.uploadLogoPrompt}
        accept={ACCEPT_ATTRIBUTE}
        files={cachedFiles}
        onChange={handleChange}
        isInvalid={isInvalid}
        display="default"
        fullWidth
        compressed
      />
      <EuiFormHelpText>
        {labels.tools.mcpClients.form.uploadLogoHelp(FORMATTED_MAX_LOGO_FILE_SIZE)}
      </EuiFormHelpText>
    </EuiFlexGroup>
  );
};
