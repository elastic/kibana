/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiToolTip, type EuiButtonColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface AddFieldProps {
  hasUpdateMappingsPrivilege?: boolean;
  color?: EuiButtonColor;
  addFieldButtonOnClick: () => void;
}

export const AddFieldButton = ({
  hasUpdateMappingsPrivilege,
  color,
  addFieldButtonOnClick,
}: AddFieldProps) => {
  const isDisabled = hasUpdateMappingsPrivilege === false;
  return (
    <EuiToolTip
      position="bottom"
      data-test-subj="indexDetailsMappingsAddFieldTooltip"
      content={
        isDisabled
          ? i18n.translate('xpack.idxMgmt.indexDetails.mappings.addNewFieldToolTip', {
              defaultMessage: 'You do not have permission to add fields to an index',
            })
          : undefined
      }
    >
      <EuiButton
        onClick={addFieldButtonOnClick}
        iconType="plusInCircle"
        color={color}
        size="m"
        data-test-subj="indexDetailsMappingsAddField"
        isDisabled={isDisabled}
      >
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.mappings.addNewField"
          defaultMessage="Add field"
        />
      </EuiButton>
    </EuiToolTip>
  );
};
