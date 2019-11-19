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
import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, SelectField } from '../../../../shared_imports';
import { CoerceParameter, IgnoreMalformedParameter } from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';
import { PARAMETERS_OPTIONS } from '../../../../constants';

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'orientation':
    case 'points_only': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'ignore_malformed': {
      // we are inverting the underlying setting by setting the label to "Reject malformed"
      return field.ignore_malformed !== undefined ? !field.ignore_malformed : true;
    }
    default:
      return false;
  }
};

interface Props {
  field: NormalizedField;
}

export const GeoShapeType = ({ field }: Props) => {
  return (
    <>
      <AdvancedSettingsWrapper>
        <EuiCallOut color="primary">
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.mappingsEditor.geoShape.infoMessage"
              defaultMessage="GeoShape types are indexed by decomposing the shape into a triangular mesh and indexing each triangle as a 7 dimension point in a BKD tree. {docsLink}"
              values={{
                docsLink: (
                  <EuiLink
                    href={documentationService.getGeoShapeDocumentationLink()}
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
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.orientationFieldTitle', {
                  defaultMessage: 'Set orientation',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.geoShape.orientationFieldDescription',
              {
                defaultMessage:
                  'Define how to interpret vertex order for polygons or multipolygons',
              }
            )}
            toggleDefaultValue={getDefaultValueToggle('orientation', field.source)}
          >
            <UseField
              path="orientation"
              config={getFieldConfig('orientation')}
              component={SelectField}
              componentProps={{
                euiFieldProps: {
                  options: PARAMETERS_OPTIONS.orientation,
                  style: { maxWidth: 300 },
                },
              }}
            />
          </EditFieldFormRow>

          {/* points_only */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.geoShape.pointsOnlyFieldTitle', {
                  defaultMessage: 'Points only',
                })}
              </h3>
            }
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.geoShape.ignoreZValueFieldDescription',
              {
                defaultMessage: 'Configures the geo_shape field type for point shapes only.',
              }
            )}
            formFieldPath="points_only"
          />

          {/* ignore_z_value */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.geoShape.ignoreZValueFieldTitle', {
                  defaultMessage: 'Ignore Z value',
                })}
              </h3>
            }
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
      </AdvancedSettingsWrapper>
    </>
  );
};
