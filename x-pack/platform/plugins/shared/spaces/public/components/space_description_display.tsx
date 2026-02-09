/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TEMPORARY: This file exists to verify that CodeQL's Models as Data extension
 * (.github/codeql/custom-queries/models/elasticsearch-sources.yml) correctly
 * flags dangerouslySetInnerHTML usage with Elasticsearch data.
 *
 * Remove this file once the CodeQL configuration is verified.
 */

import React from 'react';
import {
  buildDataTableRecord,
  getMessageFieldWithFallbacks,
} from '@kbn/discover-utils';

// BAD: Direct dangerouslySetInnerHTML from getMessageFieldWithFallbacks
export const DirectInnerHtml = ({ hit }: { hit: any }) => {
  const { value } = getMessageFieldWithFallbacks(hit.flattened, {
    includeFormattedValue: true,
  });
  return <div dangerouslySetInnerHTML={{ __html: value ?? '' }} />;
};

// BAD: Spread pattern (mirrors content_breakdown.tsx — bypasses ESLint react/no-danger)
export const SpreadPatternInnerHtml = ({ hit }: { hit: any }) => {
  const { value, formattedValue } = getMessageFieldWithFallbacks(hit.flattened, {
    includeFormattedValue: true,
  });
  const props = formattedValue
    ? { children: formattedValue }
    : { dangerouslySetInnerHTML: { __html: value ?? '' } };
  return <div {...props} />;
};

// BAD: From buildDataTableRecord
export const FromBuildRecord = ({ doc, dataView }: { doc: any; dataView: any }) => {
  const record = buildDataTableRecord(doc, dataView);
  return <div dangerouslySetInnerHTML={{ __html: record.flattened['message'] as string }} />;
};

// GOOD: Safe — using children (React auto-escapes)
export const SafeChildren = ({ hit }: { hit: any }) => {
  const { value } = getMessageFieldWithFallbacks(hit.flattened);
  return <div>{value}</div>;
};
