/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { useHistory } from 'react-router-dom';

import { useLink, useStartServices } from '../../../../../hooks';

export const CreateNewIntegrationButton: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { getAbsolutePath } = useLink();
  const { licensing } = useStartServices();
  const license = useObservable(licensing.license$);
  const history = useHistory();

  const hasEnterpriseLicense = useMemo(
    () => Boolean(license?.isAvailable && license?.isActive && license?.hasAtLeast('enterprise')),
    [license]
  );

  const enterpriseLicenseTooltip = (
    <FormattedMessage
      id="xpack.fleet.epmList.createNewIntegrationEnterpriseLicenseTooltip"
      defaultMessage="Creating or uploading integrations requires an Enterprise license."
    />
  );

  const uploadHref = getAbsolutePath('/app/integrations/upload');

  const onCreateClick = useCallback(() => {
    history.push('/create');
  }, [history]);

  const onUploadClick = useCallback(() => {
    setIsPopoverOpen(false);
    history.push('/upload');
  }, [history]);

  const createButton = (
    <EuiButton
      fill
      size="s"
      iconType="plusInCircle"
      onClick={() => onCreateClick()}
      style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, height: 40 }}
      data-test-subj="createNewIntegrationBtn"
      disabled={!hasEnterpriseLicense}
    >
      {i18n.translate('xpack.fleet.epmList.createNewIntegrationButton', {
        defaultMessage: 'Create new integration',
      })}
    </EuiButton>
  );

  const dropdownButton = (
    <EuiButtonIcon
      display="fill"
      color="primary"
      iconType="arrowDown"
      aria-label={i18n.translate('xpack.fleet.epmList.createNewIntegrationDropdownAriaLabel', {
        defaultMessage: 'More integration creation options',
      })}
      onClick={() => setIsPopoverOpen((prev) => !prev)}
      style={{
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        borderLeft: '1px solid rgba(255,255,255,0.3)',
        height: 40,
        minHeight: 0,
      }}
      data-test-subj="createNewIntegrationDropdownBtn"
      disabled={!hasEnterpriseLicense}
    />
  );

  return (
    <EuiFlexGroup gutterSize="none" responsive={false} alignItems="stretch">
      <EuiFlexItem grow={false}>
        {!hasEnterpriseLicense ? (
          <EuiToolTip content={enterpriseLicenseTooltip}>{createButton}</EuiToolTip>
        ) : (
          createButton
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ display: 'flex' }}>
        <EuiPopover
          isOpen={hasEnterpriseLicense && isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downRight"
          style={{ display: 'flex', height: '100%' }}
          aria-label={i18n.translate('xpack.fleet.epmList.createNewIntegrationDropdownAriaLabel', {
            defaultMessage: 'More integration creation options',
          })}
          button={
            !hasEnterpriseLicense ? (
              <EuiToolTip content={enterpriseLicenseTooltip}>{dropdownButton}</EuiToolTip>
            ) : (
              dropdownButton
            )
          }
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                key="upload"
                icon="exportAction"
                href={uploadHref}
                onClick={(ev) => {
                  ev.preventDefault();
                  onUploadClick();
                }}
                data-test-subj="uploadIntegrationPackageBtn"
              >
                {i18n.translate('xpack.fleet.epmList.uploadIntegrationPackageButton', {
                  defaultMessage: 'Upload integration package',
                })}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
