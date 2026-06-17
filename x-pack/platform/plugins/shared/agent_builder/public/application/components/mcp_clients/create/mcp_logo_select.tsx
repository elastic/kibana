/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiBadge, EuiComboBox, EuiFormPrepend, EuiIcon } from '@elastic/eui';
import { useAbortableAsync } from '@kbn/react-hooks';
import { useFormContext } from 'react-hook-form';
import { labels } from '../../../utils/i18n';
import { fetchAsDataUrl } from '../../../utils/data_url';
import { LOGO_OPTIONS } from './mcp_logo_options';
import type { McpClientFormData } from './types';

export interface McpLogoSelectValue {
  id: string;
  dataUrl: string;
}

export interface McpLogoSelectProps {
  value: McpLogoSelectValue | null;
  onChange: (value: McpLogoSelectValue | null) => void;
}

type LogoComboBoxOption = EuiComboBoxOptionOption<string>;

const EMPTY_ICON_URLS: ReadonlyMap<string, string> = new Map();

export const McpLogoSelect = ({ value, onChange }: McpLogoSelectProps) => {
  const { clearErrors } = useFormContext<McpClientFormData>();

  // The combobox needs to reflect the new selection immediately, but the
  // committed `value` only flows back after the async dataUrl fetch resolves.
  // `pendingId` bridges that window without holding any source-of-truth state.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const loadLogoAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => loadLogoAbortRef.current?.abort(), []);

  const { value: iconUrls = EMPTY_ICON_URLS } = useAbortableAsync(async () => {
    const entries = await Promise.all(
      Object.entries(LOGO_OPTIONS).map(
        async ([id, option]): Promise<readonly [string, string]> => [id, await option.loadIconUrl()]
      )
    );
    return new Map<string, string>(entries);
  }, []);

  const options = useMemo<LogoComboBoxOption[]>(
    () =>
      Object.entries(LOGO_OPTIONS).map(([id, option]) => {
        const iconUrl = iconUrls.get(id);
        return {
          value: id,
          label: option.label,
          prepend: iconUrl ? <EuiIcon type={iconUrl} size="m" aria-hidden /> : undefined,
          append: option.isDefault ? (
            <EuiBadge color="hollow">{labels.tools.mcpClients.form.defaultLogoBadge}</EuiBadge>
          ) : undefined,
        };
      }),
    [iconUrls]
  );

  const displayId = pendingId ?? value?.id ?? null;
  const displayOption = displayId ? LOGO_OPTIONS[displayId] : undefined;

  const selectedOptions = useMemo<LogoComboBoxOption[]>(
    () => (displayOption && displayId ? [{ value: displayId, label: displayOption.label }] : []),
    [displayOption, displayId]
  );

  const selectedIconUrl = displayId ? iconUrls.get(displayId) : undefined;

  const handleChange = useCallback(
    async (selection: LogoComboBoxOption[]) => {
      loadLogoAbortRef.current?.abort();
      const controller = new AbortController();
      loadLogoAbortRef.current = controller;
      const { signal } = controller;

      const id = selection[0]?.value;
      const option = id ? LOGO_OPTIONS[id] : undefined;

      if (!id || !option) {
        setPendingId(null);
        clearErrors('clientLogo');
        onChange(null);
        return;
      }

      setPendingId(id);

      const url = iconUrls.get(id) ?? (await option.loadIconUrl());
      if (signal.aborted) return;

      const dataUrl = await fetchAsDataUrl(url, signal);
      if (signal.aborted) return;

      clearErrors('clientLogo');
      onChange({ id, dataUrl });
      setPendingId(null);
    },
    [iconUrls, onChange, clearErrors]
  );

  return (
    <EuiComboBox
      data-test-subj="mcpClientLogoSelect"
      aria-label={labels.tools.mcpClients.form.selectLogoPlaceholder}
      placeholder={labels.tools.mcpClients.form.selectLogoPlaceholder}
      options={options}
      selectedOptions={selectedOptions}
      singleSelection={{ asPlainText: true }}
      isClearable
      onChange={handleChange}
      prepend={selectedIconUrl ? <EuiFormPrepend iconLeft={selectedIconUrl} /> : undefined}
    />
  );
};
