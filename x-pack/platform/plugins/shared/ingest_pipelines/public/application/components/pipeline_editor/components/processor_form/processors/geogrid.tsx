/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import {
  fieldValidators,
  FIELD_TYPES,
  UseField,
  Field,
  SelectField,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, from } from './shared';
import { TargetField } from './common_fields/target_field';

const fieldsConfig: FieldsConfig = {
  tile_type: {
    type: FIELD_TYPES.TEXT,
    defaultValue: '',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoGrid.tileTypeFieldLabel', {
      defaultMessage: 'Tile type',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoGrid.tileTypeFieldHelpText', {
      defaultMessage: 'The type of tile from field.',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.geoGrid.tileTypeRequiredError', {
            defaultMessage: 'A tile type value is required.',
          })
        ),
      },
    ],
  },
  /* Optional field config */
  parent_field: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoGrid.parentFieldLabel', {
      defaultMessage: 'Parent field (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.geoGrid.parentFieldHelperText"
        defaultMessage="If specified and a parent tile exists, save that tile address to this field."
      />
    ),
  },
  children_field: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoGrid.childrenFieldLabel', {
      defaultMessage: 'Children field (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.geoGrid.childrenFieldHelperText"
        defaultMessage="If specified and a children tile exists, save those tile addresses to this field as an array of strings."
      />
    ),
  },
  non_children_field: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoGrid.nonchildrenFieldLabel', {
      defaultMessage: 'Non children field (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.geoGrid.nonchildrenFieldHelperText"
        defaultMessage="If specified and intersecting non-child tiles exist, save their addresses to this field as an array of strings."
      />
    ),
  },
  precision_field: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoGrid.precisionFieldLabel', {
      defaultMessage: 'Precision field (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.geoGrid.precisionFieldHelperText"
        defaultMessage="If specified, save the tile precision (zoom) as an integer to this field."
      />
    ),
  },
  target_format: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    defaultValue: '',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoGrid.targetFormatFieldLabel', {
      defaultMessage: 'Target format (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.geoGrid.targetFormatFieldHelperText"
        defaultMessage="Which format to save the generated polygon in. Defaults to: {value}."
        values={{
          value: <EuiCode>{'Geo-JSON'}</EuiCode>,
        }}
      />
    ),
  },
};

export const GeoGrid: FunctionComponent = () => {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <FieldNameField
            helpText={
              <FormattedMessage
                id="xpack.ingestPipelines.pipelineEditor.geoGrid.fieldHelpText"
                defaultMessage="The field to interpret as a geo-tile. The field format is determined by {tile_type}."
                values={{ tile_type: <EuiCode>{'tile_type'}</EuiCode> }}
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <TargetField
            helpText={
              <FormattedMessage
                id="xpack.ingestPipelines.pipelineEditor.geoGrid.targetHelpText"
                defaultMessage="The field to assign the polygon shape to. By default {field} is updated in-place."
                values={{ field: <EuiCode>{'field'}</EuiCode> }}
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'tileTypeField',
                options: [
                  {
                    value: 'geohash',
                    text: i18n.translate(
                      'xpack.ingestPipelines.pipelineEditor.geoGrid.geohashOption',
                      { defaultMessage: 'Geo-Hash' }
                    ),
                  },
                  {
                    value: 'geotile',
                    text: i18n.translate(
                      'xpack.ingestPipelines.pipelineEditor.geoGrid.geotileOption',
                      { defaultMessage: 'Geo-Tile' }
                    ),
                  },
                  {
                    value: 'geohex',
                    text: i18n.translate(
                      'xpack.ingestPipelines.pipelineEditor.geoGrid.geohexOption',
                      { defaultMessage: 'Geo-Hex' }
                    ),
                  },
                ],
              },
            }}
            config={fieldsConfig.tile_type}
            component={SelectField}
            path="fields.tile_type"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'targetFormatField',
                options: [
                  {
                    value: 'GeoJSON',
                    text: i18n.translate(
                      'xpack.ingestPipelines.pipelineEditor.geoGrid.geojsonOption',
                      { defaultMessage: 'GeoJSON' }
                    ),
                  },
                  {
                    value: 'WKT',
                    text: i18n.translate('xpack.ingestPipelines.pipelineEditor.geoGrid.wktOption', {
                      defaultMessage: 'WKT',
                    }),
                  },
                ],
              },
            }}
            config={fieldsConfig.target_format}
            component={SelectField}
            path="fields.target_format"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <UseField
        data-test-subj="parentField"
        config={fieldsConfig.parent_field}
        component={Field}
        path="fields.parent_field"
      />

      <UseField
        data-test-subj="childrenField"
        config={fieldsConfig.children_field}
        component={Field}
        path="fields.children_field"
      />

      <UseField
        data-test-subj="nonChildrenField"
        config={fieldsConfig.non_children_field}
        component={Field}
        path="fields.non_children_field"
      />

      <UseField
        data-test-subj="precisionField"
        config={fieldsConfig.precision_field}
        component={Field}
        path="fields.precision_field"
      />

      <IgnoreMissingField />
    </>
  );
};
