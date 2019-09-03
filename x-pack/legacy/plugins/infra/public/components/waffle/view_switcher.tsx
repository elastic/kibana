/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonGroup, EuiButtonGroupProps } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

interface Props {
  view: string;
  onChange: EuiButtonGroupProps['onChange'];
  intl: InjectedIntl;
}

export const ViewSwitcher = injectI18n(({ view, onChange, intl }: Props) => {
  const buttons = [
    {
      id: 'map',
      label: intl.formatMessage({
        id: 'xpack.infra.viewSwitcher.mapViewLabel',
        defaultMessage: 'Map view',
      }),
      iconType: 'apps',
    },
    {
      id: 'table',
      label: intl.formatMessage({
        id: 'xpack.infra.viewSwitcher.tableViewLabel',
        defaultMessage: 'Table view',
      }),
      iconType: 'editorUnorderedList',
    },
  ];
  return (
    <EuiButtonGroup
      legend={intl.formatMessage({
        id: 'xpack.infra.viewSwitcher.lenged',
        defaultMessage: 'Switch between table and map view',
      })}
      options={buttons}
      color="primary"
      idSelected={view}
      onChange={onChange}
    />
  );
});
