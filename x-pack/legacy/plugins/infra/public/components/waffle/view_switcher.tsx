/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonGroup, EuiButtonGroupProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React from 'react';

interface Props {
  view: string;
  onChange: EuiButtonGroupProps['onChange'];
}

export const ViewSwitcher = ({ view, onChange }: Props) => {
  const buttons = [
    {
      id: 'map',
      label: i18n.translate('xpack.infra.viewSwitcher.mapViewLabel', {
        defaultMessage: 'Map view',
      }),
      iconType: 'apps',
    },
    {
      id: 'table',
      label: i18n.translate('xpack.infra.viewSwitcher.tableViewLabel', {
        defaultMessage: 'Table view',
      }),
      iconType: 'editorUnorderedList',
    },
  ];
  return (
    <EuiButtonGroup
      legend={i18n.translate('xpack.infra.viewSwitcher.lenged', {
        defaultMessage: 'Switch between table and map view',
      })}
      options={buttons}
      color="primary"
      idSelected={view}
      onChange={onChange}
    />
  );
};
