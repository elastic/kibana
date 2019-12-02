/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { ML_JOB_FIELD_TYPES } from '../../../../../../common/constants/field_types';

import { FieldVisConfig } from '../../common';
// @ts-ignore
import { FieldTitleBar } from '../../../../components/field_title_bar/index';
import {
  BooleanContent,
  DateContent,
  DocumentCountContent,
  GeoPointContent,
  IpContent,
  KeywordContent,
  NotInDocsContent,
  NumberContent,
  OtherContent,
  TextContent,
} from './content_types';
import { LoadingIndicator } from './loading_indicator';

export interface FieldDataCardProps {
  config: FieldVisConfig;
}

export const FieldDataCard: FC<FieldDataCardProps> = ({ config }) => {
  const { fieldName, loading, type, existsInDocs, stats } = config;

  if (stats === undefined) {
    return null;
  }

  function getCardContent() {
    if (existsInDocs === false) {
      return <NotInDocsContent />;
    }

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
    <div data-test-subj={`mlFieldDataCard ${fieldName} ${type}`}>
      <div className="mlFieldDataCard">
        <FieldTitleBar card={config} />
        <div className="mlFieldDataCard__content">
          {loading === true ? <LoadingIndicator /> : getCardContent()}
        </div>
      </div>
    </div>
  );
};
