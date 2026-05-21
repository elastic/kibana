/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';
import { groupBy, map } from 'lodash';

import {
  FIELD_TYPES,
  UseField,
  ToggleField,
  ComboBoxField,
} from '../../../../../../shared_imports';

import { useKibana } from '../../../../../../shared_imports';
import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import type { FieldsConfig } from './shared';
import { from, to } from './shared';
import { TargetField } from './common_fields/target_field';
import { PropertiesField } from './common_fields/properties_field';
import type { GeoipDatabase } from '../../../../../../../common/types';
import {
  getDatabaseOptionLabel,
  getDatabaseText,
  getDatabaseValue,
  normalizeMmdbFilename,
  MMDB_EXTENSION,
} from '../../../../../sections/manage_processors/utils';
import { getTypeLabel } from '../../../../../sections/manage_processors/constants';

const fieldsConfig: FieldsConfig = {
  /* Optional field config */
  database_file: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: (v: unknown) =>
      to.arrayOfStrings(v).map((str) => {
        const databaseName = str.split(MMDB_EXTENSION)[0];
        const knownDatabaseText = getDatabaseText(databaseName);
        // Known managed DB → return display text (e.g. "ASN" for standard_asn)
        // Local DB → return full filename (e.g. "ASN.mmdb") to match the combo box label
        return knownDatabaseText ?? str;
      }),
    serializer: (v: any[]) => {
      if (v.length) {
        const databaseName = v[0];
        // Local databases have the extension already in the label
        if (typeof databaseName === 'string' && databaseName.endsWith(MMDB_EXTENSION)) {
          return normalizeMmdbFilename(databaseName);
        }
        const databaseValue = getDatabaseValue(databaseName);
        return databaseValue
          ? `${databaseValue}${MMDB_EXTENSION}`
          : `${databaseName}${MMDB_EXTENSION}`;
      }
      return undefined;
    },
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.ipLocationForm.databaseFileLabel', {
      defaultMessage: 'Database file (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.ipLocationForm.databaseFileHelpText"
        defaultMessage="GeoIP2 database file in the {ingestGeoIP} configuration directory. Defaults to {databaseFile}."
        values={{
          databaseFile: <EuiCode>{'GeoLite2-City.mmdb'}</EuiCode>,
          ingestGeoIP: <EuiCode>{'ingest-geoip'}</EuiCode>,
        }}
      />
    ),
  },

  first_only: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(true),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.ipLocationForm.firstOnlyFieldLabel',
      {
        defaultMessage: 'First only',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.ipLocationForm.firstOnlyFieldHelpText',
      {
        defaultMessage: 'Use the first matching geo data, even if the field contains an array.',
      }
    ),
  },
};

export const IpLocation: FunctionComponent = () => {
  const { services } = useKibana();
  const { data, isLoading } = services.api.useLoadDatabases();

  const dataAsOptions = (data || []).map((item) => ({
    id: item.id,
    type: item.type,
    // Use the name of the database file for local databases and the translated text for others, if it exists
    label: getDatabaseOptionLabel(item),
  }));
  const optionsByGroup = groupBy(dataAsOptions, 'type');
  const groupedOptions = map(optionsByGroup, (items, groupName) => ({
    label: getTypeLabel(groupName as GeoipDatabase['type']),
    options: map(items, (item) => item),
  }));

  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.ipLocationForm.fieldNameHelpText',
          { defaultMessage: 'Field containing an IP address for the geographical lookup.' }
        )}
      />

      <TargetField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.ipLocationForm.targetFieldHelpText',
          {
            defaultMessage: 'Field used to contain geo data properties.',
          }
        )}
      />

      <UseField
        component={ComboBoxField}
        config={fieldsConfig.database_file}
        path="fields.database_file"
        euiFieldProps={{
          isLoading,
          noSuggestions: false,
          singleSelection: { asPlainText: true },
          options: groupedOptions,
        }}
      />

      <PropertiesField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.ipLocationForm.propertiesFieldHelpText',
          {
            defaultMessage:
              'Properties added to the target field. Valid properties depend on the database file used.',
          }
        )}
      />

      <UseField component={ToggleField} config={fieldsConfig.first_only} path="fields.first_only" />

      <IgnoreMissingField />
    </>
  );
};
