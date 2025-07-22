/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';

import { Readme } from './readme';
import { waitFor } from '@testing-library/dom';

describe('Readme', () => {
  function render(markdown: string | undefined) {
    const refs = {
      current: {
        set: jest.fn(),
        get: jest.fn(),
      },
    } as any;
    const testRenderer = createIntegrationsTestRendererMock();
    return testRenderer.render(
      <Readme packageName="test" version="1.0.0" markdown={markdown} refs={refs} />
    );
  }

  it('should render img tag with max width', async () => {
    const result = render('# Test ![Image](../img/image.png)>');

    await waitFor(() => {
      const img = result.getByAltText('Image');

      expect(img).toHaveStyle('max-width: 100%');
      expect(img).toHaveAttribute('src', '/mock/api/fleet/epm/packages/test/1.0.0/img/image.png');
    });
  });

  it('should render exported fields as accordions', async () => {
    const result = render(`
# Test Integration

This is a test integration.

## Data streams

### Logs

This integration collects logs.

#### Requirements and setup

Some requirements and setup instructions.

**Exported fields**

| Field | Description | Type |
|---|---|---|
| @timestamp | Event timestamp. | date |
| integration.category | The log category name. | keyword |

### Metrics

Some metrics information.

**Exported fields**

| Field | Description | Type | Unit | Metric Type |
|---|---|---|---|---|
| @timestamp | Event timestamp. | date |  |  |
| integration.id | Some id | keyword |  |  |
`);

    await waitFor(() => {
      const accordionSummaries = result.getAllByTestId('integrationsDocs.accordion');
      expect(accordionSummaries.length).toBe(2);

      const tables = result.container.querySelectorAll('table');
      expect(tables.length).toBe(2);
    });
  });

  it('should render empty markdown', async () => {
    const result = render('');
    await waitFor(() => {
      expect(result.container).not.toBeEmptyDOMElement();
    });
  });

  it('should render even if markdown undefined', async () => {
    const result = render(undefined);
    await waitFor(() => {
      const skeletonWrappers = result.getAllByTestId('euiSkeletonLoadingAriaWrapper');
      expect(skeletonWrappers.length).toBeGreaterThan(0);

      expect(result.container).not.toBeEmptyDOMElement();
    });
  });

  it('should render correct if no exported fields found', async () => {
    const result = render(`
# Test Integration

This is a test integration.

## Data streams

### Logs

This integration collects logs.

#### Requirements and setup

Some requirements and setup instructions.
`);

    await waitFor(() => {
      expect(result.container).not.toBeEmptyDOMElement();

      const accordion = result.queryByTestId('integrationsDocs.accordion');
      expect(accordion).not.toBeInTheDocument();
    });
  });

  it('should remove script tags', async () => {
    const result = render('<script>alert("This should not run")</script>');
    await waitFor(() => {
      expect(result.queryByText('This should not run')).not.toBeInTheDocument();
    });
  });
});
