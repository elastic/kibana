/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { waitFor } from '@testing-library/dom';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';

import { Readme } from './readme';

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

  it('should collapse sample events with "An example event looks as following" pattern', async () => {
    const result = render(`
# Test Integration

This is a test integration.

An example event looks as following

\`\`\`json
{
  "field": "value",
  "nested": {
    "field": "value"
  }
}
\`\`\`

Some other content.
`);

    await waitFor(() => {
      const accordions = result.getAllByTestId('integrationsDocs.accordion');
      expect(accordions.length).toBe(1);

      // Check that the summary text is "Example"
      const summary =
        accordions[0].querySelector('.euiAccordion__buttonContent') ||
        accordions[0].querySelector('[data-test-subj="euiAccordionDisplay"]');
      expect(summary?.textContent).toContain('Example');

      // Check that the code block is inside the accordion
      const codeBlock = accordions[0].querySelector('code');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock?.textContent).toContain('field');
    });
  });

  it('should collapse sample events with "An example event for" pattern', async () => {
    const result = render(`
# Test Integration

This is a test integration.

An example event for version 8.0 looks like this:

\`\`\`json
{
  "field": "value",
  "version": "8.0"
}
\`\`\`

Some other content.
`);

    await waitFor(() => {
      const accordions = result.getAllByTestId('integrationsDocs.accordion');
      expect(accordions.length).toBe(1);

      // Check that the summary text is "Example"
      const summary =
        accordions[0].querySelector('.euiAccordion__buttonContent') ||
        accordions[0].querySelector('[data-test-subj="euiAccordionDisplay"]');
      expect(summary?.textContent).toContain('Example');

      // Check that the code block is inside the accordion
      const codeBlock = accordions[0].querySelector('code');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock?.textContent).toContain('version');
    });
  });

  it('should handle multiple sample events in the same document', async () => {
    const result = render(`
# Test Integration

An example event looks as following

\`\`\`json
{
  "event_type": "first",
  "field": "value1"
}
\`\`\`

An example event for the second type:

\`\`\`json
{
  "event_type": "second",
  "field": "value2"
}
\`\`\`
`);

    await waitFor(() => {
      const accordions = result.getAllByTestId('integrationsDocs.accordion');
      expect(accordions.length).toBe(2);

      // Check that the code blocks are inside the accordions
      const codeBlocks = result.container.querySelectorAll('code');
      expect(codeBlocks.length).toBe(2);

      // Verify the content of both code blocks
      const codeTexts = Array.from(codeBlocks).map((block) => block.textContent);
      expect(codeTexts).toEqual(
        expect.arrayContaining([
          expect.stringContaining('first'),
          expect.stringContaining('second'),
        ])
      );
    });
  });

  it('should not create collapsible sections when no sample events are present', async () => {
    const result = render(`
# Test Integration

This is a test integration with no sample events.

\`\`\`json
{
  "just": "a regular code block"
}
\`\`\`
`);

    await waitFor(() => {
      // No accordions should be created
      const accordions = result.queryAllByTestId('integrationsDocs.accordion');
      expect(accordions.length).toBe(0);

      // Code block should still be present
      const codeBlock = result.container.querySelector('code');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock?.textContent).toContain('regular code block');
    });
  });

  it('should remove script tags', async () => {
    const result = render('<script>alert("This should not run")</script>');
    await waitFor(() => {
      expect(result.queryByText('This should not run')).not.toBeInTheDocument();
    });
  });

  it('should render tooltips from EUI tooltip syntax', async () => {
    const result = render(`
# Test Integration

This is a test with !{tooltip[hover me](This is the tooltip content)} in the text.
`);

    await waitFor(() => {
      // Check that the tooltip wrapper span exists
      const tooltipWrapper = result.container.querySelector('.eui-tooltip-wrapper');
      expect(tooltipWrapper).toBeInTheDocument();

      // Check that the anchor text is rendered
      expect(result.getByText('hover me')).toBeInTheDocument();

      // Check that the title attribute contains the tooltip content
      expect(tooltipWrapper).toHaveAttribute('title', 'This is the tooltip content');
    });
  });

  it('should handle multiple tooltips in the same document', async () => {
    const result = render(`
# Test Integration

First !{tooltip[tooltip one](Content one)} and second !{tooltip[tooltip two](Content two)}.
`);

    await waitFor(() => {
      // Check that both tooltip wrappers exist
      const tooltipWrappers = result.container.querySelectorAll('.eui-tooltip-wrapper');
      expect(tooltipWrappers.length).toBe(2);

      // Check that both anchor texts are rendered
      expect(result.getByText('tooltip one')).toBeInTheDocument();
      expect(result.getByText('tooltip two')).toBeInTheDocument();

      // Check that both tooltips have their respective content
      expect(tooltipWrappers[0]).toHaveAttribute('title', 'Content one');
      expect(tooltipWrappers[1]).toHaveAttribute('title', 'Content two');
    });
  });

  it('should escape quotes in tooltip content', async () => {
    const result = render(`
# Test Integration

This has !{tooltip[text](Content with "quotes" inside)} in it.
`);

    await waitFor(() => {
      const tooltipWrapper = result.container.querySelector('.eui-tooltip-wrapper');
      expect(tooltipWrapper).toBeInTheDocument();

      // Quotes should be escaped as &quot;
      expect(tooltipWrapper).toHaveAttribute('title', 'Content with &quot;quotes&quot; inside');
    });
  });
});
