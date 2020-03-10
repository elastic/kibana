/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiIcon, EuiPopover } from '@elastic/eui';
import { Transaction } from '../../../../../../../plugins/apm/typings/es_schemas/ui/transaction';
import { useLicense } from '../../../hooks/useLicense';
import { CustomLink } from '.';

export const CustomLinkMenu = ({
  transaction
}: {
  transaction: Transaction;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const license = useLicense();
  const hasValidLicense = license?.isActive && license?.hasAtLeast('gold');
  if (!hasValidLicense) {
    return null;
  }

  const button = (
    <EuiButtonEmpty
      onClick={() => setIsOpen(true)}
      iconType="arrowDown"
      iconSide="right"
    >
      <>
        <EuiIcon type="editorLink" size="l" />
        {i18n.translate('xpack.apm.customLinkMenu.button', {
          defaultMessage: 'Custom links'
        })}
      </>
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      id="popover"
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upCenter"
    >
      <CustomLink transaction={transaction} />
    </EuiPopover>
  );
};
