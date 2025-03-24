/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { WarningCheckbox, WarningCheckboxProps } from './warning_step_checkbox';

export const IncompatibleDataInDataStreamWarningCheckbox: React.FunctionComponent<
  WarningCheckboxProps
> = ({ isChecked, onChange, id }) => {
  return (
    <WarningCheckbox
      isChecked={isChecked}
      onChange={onChange}
      warningId={id}
      label={
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.incompatibleDataWarningTitle"
          defaultMessage="Reindex all incompatible data for this data stream"
        />
      }
      description={null}
    />
  );
};
