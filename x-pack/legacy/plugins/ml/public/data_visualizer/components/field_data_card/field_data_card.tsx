/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { ML_JOB_FIELD_TYPES } from '../../../../common/constants/field_types';

import { FieldVisConfig } from '../../common';
// @ts-ignore
import { FieldTitleBar } from '../../../components/field_title_bar';
import {
  BooleanContent,
  DateContent,
  DocumentCountContent,
  GeoPointContent,
  IpContent,
  KeywordContent,
  NumberContent,
  OtherContent,
  TextContent,
} from './content_types';

interface Props {
  config: FieldVisConfig;
}

export const FieldDataCard: FC<Props> = ({ config }) => {
  const { fieldName, loading, type, existsInDocs } = config;

  function getCardContent() {
    switch (type) {
      case ML_JOB_FIELD_TYPES.NUMBER:
        if (fieldName !== undefined) {
          return <NumberContent config={config} />;
        } else {
          return <DocumentCountContent config={config} />;
        }

      case ML_JOB_FIELD_TYPES.BOOLEAN:
        return <BooleanContent config={config} />;

      case ML_JOB_FIELD_TYPES.DATE:
        return <DateContent config={config} />;

      case ML_JOB_FIELD_TYPES.GEO_POINT:
        return <GeoPointContent config={config} />;

      case ML_JOB_FIELD_TYPES.IP:
        return <IpContent config={config} />;

      case ML_JOB_FIELD_TYPES.KEYWORD:
        return <KeywordContent config={config} />;

      case ML_JOB_FIELD_TYPES.TEXT:
        return <TextContent config={config} />;

      default:
        return <OtherContent config={config} />;
    }
  }

  return (
    <div data-test-subj={`mlFieldDataCard_${fieldName}`}>
      <div className="mlFieldDataCard">
        <FieldTitleBar card={config} />
        <div className="mlFieldDataCard__content">
          {loading === true && (
            <Fragment>
              <EuiSpacer size="xxl" />
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="l" />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued">
                    <FormattedMessage
                      id="xpack.ml.fieldDataCard.loadingLabel"
                      defaultMessage="Loading"
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          )}
          {loading === false && existsInDocs === true && getCardContent()}
          {loading === false && existsInDocs === false && (
            <Fragment>
              <EuiSpacer size="xxl" />
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs" justifyContent="spaceAround">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="alert" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiFlexGroup style={{ padding: '0px 16px', textAlign: 'center' }}>
                    <EuiFlexItem grow={false}>
                      <FormattedMessage
                        id="xpack.ml.fieldDataCard.fieldNotInDocsLabel"
                        defaultMessage="This field does not appear in any documents for the selected time range"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          )}
        </div>
      </div>
    </div>
  );
};
