/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiSpacer, EuiAccordion, EuiTextColor, EuiPanel, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConfigurationFormItems } from './configuration/configuration_form_items';
import { ConfigEntryView } from '../types/types';

// Custom trigger button CSS
const buttonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

interface AdditionalOptionsFieldsProps {
  optionalProviderFormFields: ConfigEntryView[];
  onSetProviderConfigEntry: (key: string, value: unknown) => Promise<void>;
  isEdit?: boolean;
}

export const MoreOptionsFields: React.FC<AdditionalOptionsFieldsProps> = ({
  optionalProviderFormFields,
  onSetProviderConfigEntry,
  isEdit,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiAccordion
      id="inferenceMoreOptions"
      data-test-subj="inference-endpoint-more-options"
      buttonProps={{ css: buttonCss }}
      css={css`
        .euiAccordion__triggerWrapper {
          display: inline-flex;
        }
      `}
      element="fieldset"
      arrowDisplay="right"
      arrowProps={{
        color: 'primary',
      }}
      buttonElement="button"
      borders="none"
      buttonContent={
        <EuiTextColor color={euiTheme.colors.primary}>
          <FormattedMessage
            id="xpack.inferenceEndpointUICommon.components.additionalInfo.moreOptionLabel"
            defaultMessage="More options"
          />
        </EuiTextColor>
      }
      initialIsOpen={false}
    >
      <EuiSpacer size="m" />
      <EuiPanel hasBorder={true}>
        {optionalProviderFormFields.length > 0 ? (
          <>
            <ConfigurationFormItems
              isLoading={false}
              direction="column"
              items={optionalProviderFormFields}
              setConfigEntry={onSetProviderConfigEntry}
              isEdit={isEdit}
            />
            <EuiSpacer size="m" />
          </>
        ) : null}
      </EuiPanel>
    </EuiAccordion>
  );
};
