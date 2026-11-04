/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CONNECTOR_TYPE_ICON_MAX_BYTES } from '@kbn/actions-plugin/common';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useKibana } from '../../../../common/lib/kibana';
import { fetchConnectorTypeLogo } from '../../../lib/action_connector_api';
import type { BuildConnectorFormData } from '../types';
import { getLogoErrorMessage, isHttpUrl } from '../lib/connector_logo';

const MAX_LOGO_KB = CONNECTOR_TYPE_ICON_MAX_BYTES / 1024;

/**
 * The connector type's logo, read from an image URL and kept with the type. It loads when the URL
 * is pasted or the field loses focus, so the preview shows without an extra step; saving loads it
 * too if that has not happened yet.
 */
const ConnectorLogoFieldComponent: React.FC = () => {
  const { http } = useKibana().services;
  const { control, setValue, trigger } = useFormContext<BuildConnectorFormData>();
  const icon = useWatch({ control, name: 'icon' });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  // Only the latest load may update the form, so a slow response cannot replace a newer logo.
  const latestRequest = useRef(0);
  const isPasting = useRef(false);

  const loadLogo = useCallback(
    async (url: string) => {
      const requestId = ++latestRequest.current;
      setIsLoading(true);
      setLoadError(undefined);
      try {
        const { icon: loadedIcon } = await fetchConnectorTypeLogo({ http, url });
        if (requestId !== latestRequest.current) return;
        setValue('icon', loadedIcon, { shouldDirty: true });
        void trigger('logoUrl');
      } catch (error) {
        if (requestId !== latestRequest.current) return;
        setLoadError(getLogoErrorMessage(error));
      } finally {
        if (requestId === latestRequest.current) setIsLoading(false);
      }
    },
    [http, setValue, trigger]
  );

  const loadIfNeeded = useCallback(
    (value: string) => {
      const url = value.trim();
      if (isHttpUrl(url)) {
        void loadLogo(url);
      }
    },
    [loadLogo]
  );

  const removeLogo = useCallback(() => {
    latestRequest.current++;
    setIsLoading(false);
    setLoadError(undefined);
    setValue('icon', '', { shouldDirty: true });
    setValue('logoUrl', '', { shouldDirty: true });
    void trigger('logoUrl');
  }, [setValue, trigger]);

  return (
    <Controller
      name="logoUrl"
      control={control}
      render={({ field, fieldState: { error } }) => {
        const message = loadError ?? error?.message;
        return (
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.logo.label',
              { defaultMessage: 'Logo URL' }
            )}
            helpText={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.logo.helpText',
              {
                defaultMessage:
                  'Optional. A public PNG, JPEG, GIF, WebP or SVG image of up to {maxKb} KB. It is read once and stored with the connector type.',
                values: { maxKb: MAX_LOGO_KB },
              }
            )}
            fullWidth
            isInvalid={!!message}
            error={message}
          >
            <>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiFieldText
                    fullWidth
                    isInvalid={!!message}
                    placeholder="https://example.com/logo.png"
                    data-test-subj="buildConnectorLogoUrlInput"
                    value={field.value ?? ''}
                    isLoading={isLoading}
                    onChange={(event) => {
                      const { value } = event.target;
                      // A new URL makes the current logo stale; it is replaced once the URL loads.
                      latestRequest.current++;
                      setIsLoading(false);
                      setLoadError(undefined);
                      setValue('icon', '', { shouldDirty: true });
                      field.onChange(value);
                      if (isPasting.current) {
                        isPasting.current = false;
                        loadIfNeeded(value);
                      }
                    }}
                    onPaste={() => {
                      isPasting.current = true;
                    }}
                    onBlur={() => {
                      field.onBlur();
                      if (!icon && !isLoading) loadIfNeeded(field.value ?? '');
                    }}
                    inputRef={field.ref}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              {icon && (
                <>
                  <EuiSpacer size="s" />
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    data-test-subj="buildConnectorLogoPreview"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={icon}
                        size="xl"
                        title={i18n.translate(
                          'xpack.triggersActionsUI.sections.buildConnectorPage.logo.previewTitle',
                          { defaultMessage: 'Connector type logo' }
                        )}
                        data-test-subj="buildConnectorLogoImage"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color="subdued">
                        {i18n.translate(
                          'xpack.triggersActionsUI.sections.buildConnectorPage.logo.loaded',
                          { defaultMessage: 'Logo loaded' }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        iconType="trash"
                        color="danger"
                        onClick={removeLogo}
                        data-test-subj="buildConnectorLogoRemoveButton"
                      >
                        {i18n.translate(
                          'xpack.triggersActionsUI.sections.buildConnectorPage.logo.remove',
                          { defaultMessage: 'Remove logo' }
                        )}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              )}
            </>
          </EuiFormRow>
        );
      }}
    />
  );
};

export const ConnectorLogoField = memo(ConnectorLogoFieldComponent);
