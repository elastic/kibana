/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';

import { documentationService } from '../../../../../../services/documentation';
import { NormalizedField, Field as FieldType, ParameterName } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, Field } from '../../../../shared_imports';
import { CoerceParameter, IgnoreMalformedParameter } from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow } from '../edit_field';
import { PARAMETERS_OPTIONS } from '../../../../constants';

const getDefaultValueToggle = (param: ParameterName, field: FieldType): boolean => {
  const { defaultValue } = getFieldConfig(param);

  switch (param) {
    // Switches that don't map to a boolean in the mappings
    case 'orientation': {
      return field[param] !== undefined && field[param] !== defaultValue;
    }
    default:
      // All "boolean" parameters
      return field[param] !== undefined
        ? (field[param] as boolean) // If the field has a value set, use it
        : defaultValue !== undefined // If the parameter definition has a "defaultValue" set, use it
        ? (defaultValue as boolean)
        : false; // Defaults to "false"
  }
};

interface Props {
  field: NormalizedField;
}

export const GeoShapeType = ({ field }: Props) => {
  return (
    <>
      <EuiCallOut color="primary">
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.geoShape.infoMessage"
            defaultMessage="GeoShape types are indexed by decomposing the shape into a triangular mesh and indexing each triangle as a 7 dimension point in a BKD tree. {docsLink}"
            values={{
              docsLink: (
                <EuiLink
                  href={documentationService.getTypeDocLink('geo_shape', 'learnMore')}
                  target="_blank"
                >
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.geoShape.learnMoreLink', {
                    defaultMessage: 'Learn more.',
                  })}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>

      <EuiSpacer />

      <EditFieldSection>
        {/* orientation */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.geoShapeType.orientationFieldTitle', {
            defaultMessage: 'Set orientation',
          })}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.geoShapeType.orientationFieldDescription',
            {
              defaultMessage:
                'Define how to interpret vertex order for polygons / multipolygons. This parameter defines one of two coordinate system rules (Right-hand or Left-hand).',
            }
          )}
          toggleDefaultValue={getDefaultValueToggle('orientation', field.source)}
        >
          <UseField
            path="orientation"
            config={getFieldConfig('orientation')}
            component={Field}
            componentProps={{
              euiFieldProps: {
                options: PARAMETERS_OPTIONS.orientation,
                style: { minWidth: 300 },
              },
            }}
          />
        </EditFieldFormRow>

        {/* points_only */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.geoShape.pointsOnlyFieldTitle', {
            defaultMessage: 'Points only',
          })}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.geoShape.pointsOnlyFieldDescription',
            {
              defaultMessage: 'Configures the geo_shape field type for point shapes only.',
            }
          )}
          formFieldPath="points_only"
        />

        {/* ignore_z_value */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.geoShape.ignoreZValueFieldTitle', {
            defaultMessage: 'Ignore Z value',
          })}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.geoShape.ignoreZValueFieldDescription',
            {
              defaultMessage:
                'If enabled, three dimension points will be accepted, but only latitude and longitude values will be indexed; the third dimension is ignored.',
            }
          )}
        />

        {/* coerce */}
        <CoerceParameter />

        {/* ignore_malformed */}
        <IgnoreMalformedParameter
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.geoShape.ignoreMalformedFieldDescription',
            {
              defaultMessage: 'Whether to ignore malformed GeoJSON or WKT shapes.',
            }
          )}
        />
      </EditFieldSection>
    </>
  );
};
