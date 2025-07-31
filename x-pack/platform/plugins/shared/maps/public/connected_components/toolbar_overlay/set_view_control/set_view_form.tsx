/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiRadioGroup,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { MapCenter, MapSettings } from '../../../../common/descriptor_types';
import { DecimalDegreesForm } from './decimal_degrees_form';
import { MgrsForm } from './mgrs_form';
import { UtmForm } from './utm_form';

const DEGREES_DECIMAL = 'dd';
const MGRS = 'mgrs';
const UTM = 'utm';

const COORDINATE_SYSTEM_OPTIONS = [
  {
    id: DEGREES_DECIMAL,
    label: i18n.translate('xpack.maps.setViewControl.decimalDegreesLabel', {
      defaultMessage: 'Decimal degrees',
    }),
  },
  {
    id: UTM,
    label: 'UTM',
  },
  {
    id: MGRS,
    label: 'MGRS',
  },
];

interface SetViewFormProps {
  settings: MapSettings;
  zoom: number;
  center: MapCenter;
  onSubmit: (lat: number, lon: number, zoom: number) => void;
}

export const SetViewForm = React.memo<SetViewFormProps>(({ settings, zoom, center, onSubmit }) => {
  const { euiTheme } = useEuiTheme();
  const [coordinateSystem, setCoordinateSystem] = useState<string>(DEGREES_DECIMAL);

  const onCoordinateSystemChange = useCallback((optionId: string) => {
    setCoordinateSystem(optionId);
  }, []);

  const renderForm = () => {
    switch (coordinateSystem) {
      case MGRS:
        return <MgrsForm settings={settings} zoom={zoom} center={center} onSubmit={onSubmit} />;
      case UTM:
        return <UtmForm settings={settings} zoom={zoom} center={center} onSubmit={onSubmit} />;
      default:
        return (
          <DecimalDegreesForm settings={settings} zoom={zoom} center={center} onSubmit={onSubmit} />
        );
    }
  };

  return (
    <div
      data-test-subj="mapSetViewForm"
      css={css`
        width: 240px;
      `}
    >
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="controlsHorizontal" />
            </EuiFlexItem>
            <EuiFlexItem>
              <FormattedMessage
                id="xpack.maps.setViewControl.changeCoordinateSystemButtonLabel"
                defaultMessage="Coordinate system"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        css={css`
          border-bottom: 1px solid ${euiTheme.colors.backgroundLightText};
          margin-bottom: ${euiTheme.size.s};
          padding-bottom: ${euiTheme.size.s};
        `}
      >
        <EuiRadioGroup
          options={COORDINATE_SYSTEM_OPTIONS}
          idSelected={coordinateSystem}
          onChange={onCoordinateSystemChange}
        />
      </EuiFormRow>
      {renderForm()}
    </div>
  );
});

SetViewForm.displayName = 'SetViewForm';
