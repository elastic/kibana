/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiSpacer } from '@elastic/eui';

import { documentationService } from '../../../../services/documentation';
import {
  getUseField,
  FormDataProvider,
  FormRow,
  Field,
  ToggleField,
  CheckBoxField,
} from '../../shared_imports';
import { ALL_DATE_FORMAT_OPTIONS } from '../../constants';

const UseField = getUseField({ component: Field });

export const DynamicMapping = () => (
  <FormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicMappingTitle', {
      defaultMessage: 'Dynamic mapping',
    })}
    description={
      <>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dynamicMappingDescription"
          defaultMessage="Dynamic mapping allows an index template to intrerpret unmapped fields. {docsLink}"
          values={{
            docsLink: (
              <EuiLink href={documentationService.getDynamicMappingLink()} target="_blank">
                {i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicMappingDocumentionLink', {
                  defaultMessage: 'Learn more.',
                })}
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="m" />
        <UseField path="enabled" component={ToggleField} />
      </>
    }
  >
    <FormDataProvider pathsToWatch={['enabled', 'date_detection']}>
      {({ enabled, date_detection }) => {
        // Enabled is true by default
        if (enabled) {
          return (
            <>
              <UseField path="numeric_detection" />
              <UseField path="date_detection" />
              {/* eslint-disable @typescript-eslint/camelcase */}
              {date_detection && (
                <UseField
                  path="dynamic_date_formats"
                  componentProps={{
                    euiFieldProps: {
                      options: ALL_DATE_FORMAT_OPTIONS,
                      noSuggestions: false,
                    },
                  }}
                />
              )}
              {/* eslint-enable @typescript-eslint/camelcase */}
            </>
          );
        } else {
          return <UseField path="throwErrorsForUnmappedFields" component={CheckBoxField} />;
        }
      }}
    </FormDataProvider>
  </FormRow>
);
