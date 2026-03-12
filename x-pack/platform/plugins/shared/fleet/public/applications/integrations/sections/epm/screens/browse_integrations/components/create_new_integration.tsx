/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';

import { useLink } from '../../../../../hooks';

export const CreateNewIntegrationButton: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { getAbsolutePath } = useLink();
  const history = useHistory();

  const uploadHref = getAbsolutePath('/app/integrations/upload');

  const onCreateClick = useCallback(() => {
    history.push('/create');
  }, [history]);

  const onUploadClick = useCallback(() => {
    setIsPopoverOpen(false);
    history.push('/upload');
  }, [history]);

  return (
    <EuiFlexGroup gutterSize="none" responsive={false} alignItems="stretch">
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          size="s"
          iconType="plusInCircle"
          onClick={() => onCreateClick()}
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          data-test-subj="createNewIntegrationBtn"
        >
          {i18n.translate('xpack.fleet.epmList.createNewIntegrationButton', {
            defaultMessage: 'Create new integration',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ display: 'flex' }}>
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downRight"
          style={{ display: 'flex', height: '100%' }}
          button={
            <EuiButtonIcon
              display="fill"
              color="primary"
              iconType="arrowDown"
              aria-label={i18n.translate(
                'xpack.fleet.epmList.createNewIntegrationDropdownAriaLabel',
                { defaultMessage: 'More integration creation options' }
              )}
              onClick={() => setIsPopoverOpen((prev) => !prev)}
              style={{
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: '1px solid rgba(255,255,255,0.3)',
                height: '100%',
                minHeight: 0,
              }}
              data-test-subj="createNewIntegrationDropdownBtn"
            />
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
