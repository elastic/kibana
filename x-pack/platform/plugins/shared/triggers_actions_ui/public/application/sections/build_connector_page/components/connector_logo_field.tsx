/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiButton,
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

const MAX_LOGO_KB = CONNECTOR_TYPE_ICON_MAX_BYTES / 1024;

const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

const getErrorMessage = (error: { body?: { message?: string } }): string =>
  error.body?.message ??
  i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.logo.loadErrorFallback', {
    defaultMessage: 'The logo could not be loaded.',
  });

/** The connector type's logo: loaded once from an image URL, then kept with the type. */
const ConnectorLogoFieldComponent: React.FC = () => {
  const { http } = useKibana().services;
  const { control, setValue, trigger } = useFormContext<BuildConnectorFormData>();
  const icon = useWatch({ control, name: 'icon' });
  const logoUrl = useWatch({ control, name: 'logoUrl' });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const loadLogo = useCallback(async () => {
    setIsLoading(true);
    setLoadError(undefined);
    try {
      const { icon: loadedIcon } = await fetchConnectorTypeLogo({ http, url: logoUrl.trim() });
      setValue('icon', loadedIcon, { shouldDirty: true });
      void trigger('logoUrl');
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [http, logoUrl, setValue, trigger]);

  const removeLogo = useCallback(() => {
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
                    onChange={(event) => {
                      setLoadError(undefined);
                      field.onChange(event.target.value);
                    }}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    isLoading={isLoading}
                    isDisabled={!isHttpUrl((logoUrl ?? '').trim())}
                    onClick={loadLogo}
                    data-test-subj="buildConnectorLogoLoadButton"
                  >
                    {i18n.translate(
                      'xpack.triggersActionsUI.sections.buildConnectorPage.logo.loadButton',
                      { defaultMessage: 'Load logo' }
                    )}
                  </EuiButton>
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
