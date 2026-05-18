/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import { ModelStatusBadge } from './model_status_badge';
import { EisModelStatus } from '../../types';

const ID = 'model-1';

const metadata: EisInferenceEndpointMetadata = {
  heuristics: { status: 'deprecated', end_of_life_date: '2099-01-01' },
};

describe('ModelStatusBadge', () => {
  describe('Preview', () => {
    it('renders the preview badge when iconOnly is false', () => {
      const { getByTestId } = render(
        <ModelStatusBadge id={ID} status={EisModelStatus.Preview} metadata={undefined} />
      );
      expect(getByTestId(`modelPreviewBadge-${ID}`)).toBeInTheDocument();
    });

    it('renders nothing when iconOnly is true', () => {
      const { queryByTestId, container } = render(
        <ModelStatusBadge id={ID} status={EisModelStatus.Preview} metadata={undefined} iconOnly />
      );
      expect(queryByTestId(`modelPreviewBadge-${ID}`)).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Deprecated', () => {
    it('renders the deprecated badge', () => {
      const { getByTestId, queryByTestId } = render(
        <ModelStatusBadge id={ID} status={EisModelStatus.Deprecated} metadata={metadata} />
      );
      expect(getByTestId(`modelDeprecatedBadge-${ID}`)).toBeInTheDocument();
      expect(queryByTestId(`modelEolBadge-${ID}`)).not.toBeInTheDocument();
    });

    it('renders the deprecated badge in iconOnly mode', () => {
      const { getByTestId } = render(
        <ModelStatusBadge id={ID} status={EisModelStatus.Deprecated} metadata={metadata} iconOnly />
      );
      expect(getByTestId(`modelDeprecatedBadge-${ID}`)).toBeInTheDocument();
    });
  });

  describe('DeprecatedEOL', () => {
    it('renders the EOL badge', () => {
      const { getByTestId, queryByTestId } = render(
        <ModelStatusBadge id={ID} status={EisModelStatus.DeprecatedEOL} metadata={metadata} />
      );
      expect(getByTestId(`modelEolBadge-${ID}`)).toBeInTheDocument();
      expect(queryByTestId(`modelDeprecatedBadge-${ID}`)).not.toBeInTheDocument();
    });

    it('renders the EOL badge in iconOnly mode', () => {
      const { getByTestId } = render(
        <ModelStatusBadge
          id={ID}
          status={EisModelStatus.DeprecatedEOL}
          metadata={metadata}
          iconOnly
        />
      );
      expect(getByTestId(`modelEolBadge-${ID}`)).toBeInTheDocument();
    });
  });

  it.each([EisModelStatus.GA, EisModelStatus.Unknown])('renders nothing for %s', (status) => {
    const { container, queryByTestId } = render(
      <ModelStatusBadge id={ID} status={status} metadata={undefined} />
    );
    expect(queryByTestId(`modelPreviewBadge-${ID}`)).not.toBeInTheDocument();
    expect(queryByTestId(`modelDeprecatedBadge-${ID}`)).not.toBeInTheDocument();
    expect(queryByTestId(`modelEolBadge-${ID}`)).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });
});
