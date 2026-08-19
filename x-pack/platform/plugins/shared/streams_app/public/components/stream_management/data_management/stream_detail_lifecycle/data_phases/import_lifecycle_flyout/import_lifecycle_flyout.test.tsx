/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { IMPORT_METHOD_DLM, IMPORT_METHOD_ILM } from './constants';
import { ImportLifecycleFlyout } from './import_lifecycle_flyout';
import type { ImportLifecycleOption } from './types';

const options: ImportLifecycleOption[] = [
  {
    name: 'ilm-with-downsampling',
    method: IMPORT_METHOD_ILM,
    descriptionParts: ['60d', '1 downsample'],
    hasDownsampling: true,
  },
  {
    name: 'dlm-with-downsampling',
    method: IMPORT_METHOD_DLM,
    descriptionParts: ['60d', '1 downsample'],
    hasDownsampling: true,
  },
  {
    name: 'logs-without-downsampling',
    method: IMPORT_METHOD_DLM,
    descriptionParts: ['60d'],
  },
];

const renderFlyout = ({
  selectedOptionName,
  canUseDownsampling,
}: {
  selectedOptionName: string;
  canUseDownsampling: boolean;
}) =>
  render(
    <ImportLifecycleFlyout
      titleId="streamsImportLifecycleFlyoutTestTitle"
      options={options}
      selectedOptionName={selectedOptionName}
      onSelectOption={() => {}}
      onInspect={() => {}}
      isLoadingStreams={false}
      selectedMethods={[]}
      onChangeSelectedMethods={() => {}}
      onApply={() => {}}
      onClose={() => {}}
      isApplyDisabled={false}
      canUseDownsampling={canUseDownsampling}
    />,
    { wrapper: EuiThemeProvider }
  );

describe('ImportLifecycleFlyout', () => {
  it('uses the ILM policy warning copy when importing from an ILM source with downsampling', () => {
    renderFlyout({
      selectedOptionName: 'ilm-with-downsampling',
      canUseDownsampling: false,
    });

    expect(screen.getByTestId('flyoutFooter-downsamplingNotAppliedCallout')).toHaveTextContent(
      'downsampling steps from the selected ILM policy will be excluded'
    );
  });

  it('uses the import-stream warning copy when importing from a DLM source with downsampling', () => {
    renderFlyout({
      selectedOptionName: 'dlm-with-downsampling',
      canUseDownsampling: false,
    });

    expect(screen.getByTestId('flyoutFooter-downsamplingNotAppliedCallout')).toHaveTextContent(
      'downsampling steps from the imported lifecycles will be excluded'
    );
  });

  it('does not show the warning when selected source has no downsampling', () => {
    renderFlyout({
      selectedOptionName: 'logs-without-downsampling',
      canUseDownsampling: false,
    });

    expect(
      screen.queryByTestId('flyoutFooter-downsamplingNotAppliedCallout')
    ).not.toBeInTheDocument();
  });

  it('does not show the warning when the target can use downsampling', () => {
    renderFlyout({
      selectedOptionName: 'ilm-with-downsampling',
      canUseDownsampling: true,
    });

    expect(
      screen.queryByTestId('flyoutFooter-downsamplingNotAppliedCallout')
    ).not.toBeInTheDocument();
  });
});
