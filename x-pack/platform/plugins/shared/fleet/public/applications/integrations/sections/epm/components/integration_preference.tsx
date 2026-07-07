/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiLink, EuiText, EuiForm, EuiRadioGroup, EuiSpacer } from '@elastic/eui';

import { useStartServices } from '../../../hooks';

export type IntegrationPreferenceType = 'beats' | 'agent';

interface Option {
  type: IntegrationPreferenceType;
  label: React.ReactNode;
}

export interface Props {
  initialType: IntegrationPreferenceType;
  onChange: (type: IntegrationPreferenceType) => void;
}

const options: Option[] = [
  {
    type: 'agent',
    label: i18n.translate('xpack.fleet.epm.integrationPreference.elasticAgentLabel', {
      defaultMessage: 'Elastic Agent only',
    }),
  },
  {
    type: 'beats',
    label: i18n.translate('xpack.fleet.epm.integrationPreference.beatsLabel', {
      defaultMessage: 'Beats only',
    }),
  },
];

export const IntegrationPreference = ({ initialType, onChange }: Props) => {
  const [idSelected, setIdSelected] = React.useState<IntegrationPreferenceType>(initialType);

  const { docLinks } = useStartServices();

  const link = (
    <EuiLink href={docLinks.links.fleet.beatsAgentComparison}>
      <FormattedMessage
        id="xpack.fleet.epm.integrationPreference.titleLink"
        defaultMessage="Elastic Agent and Beats"
      />
    </EuiLink>
  );

  const title = (
    <FormattedMessage
      id="xpack.fleet.epm.integrationPreference.title"
      defaultMessage="If an integration is available for {link}, show:"
      values={{ link }}
    />
  );

  const radios = options.map((option) => ({
    id: option.type,
    value: option.type,
    label: option.label,
  }));

  return (
    <EuiPanel hasShadow={false} paddingSize="none">
      <EuiForm>
        <EuiRadioGroup
          legend={{
            children: <EuiText size="s">{title}</EuiText>,
          }}
          options={radios}
          idSelected={idSelected}
          onChange={(id, value) => {
            setIdSelected(id as IntegrationPreferenceType);
            onChange(value as IntegrationPreferenceType);
          }}
          name="preference"
        />
      </EuiForm>
      <EuiSpacer size="m" />
    </EuiPanel>
  );
};
