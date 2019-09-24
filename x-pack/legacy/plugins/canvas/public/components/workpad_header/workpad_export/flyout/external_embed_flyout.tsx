/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiCode,
  EuiCallOut,
  EuiCodeBlock,
  EuiButton,
  EuiSteps,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiLink,
} from '@elastic/eui';
import { OnCopyFn, OnExportFn, OnCloseFn } from '../workpad_export';
import { Clipboard } from '../../../clipboard';

interface Props {
  onCopy: OnCopyFn;
  onExport: OnExportFn;
  onClose: OnCloseFn;
}

const staticEmbedSteps = (onExport: OnExportFn, onCopy: OnCopyFn, onClose: OnCloseFn) => [
  {
    title: 'Download workpad',
    children: (
      <EuiText size="s">
        <p>The workpad will be exported as a single JSON file for sharing in another site.</p>
        <EuiSpacer size="s" />
        <EuiButton
          onClick={() => {
            onExport('embed');
          }}
          size="s"
        >
          Download workpad
        </EuiButton>
      </EuiText>
    ),
  },
  {
    title: 'Download runtime',
    children: (
      <EuiText size="s">
        <p>
          In order to render a shareable Workpad, you also need to include the Canvas Shareable
          Workpad Runtime. You can skip this step if the runtime is already included on your
          website.
        </p>
        <EuiSpacer size="s" />
        <EuiButton
          onClick={() => {
            onExport('runtime');
          }}
          size="s"
        >
          Download runtime
        </EuiButton>
      </EuiText>
    ),
  },
  {
    title: 'Add snippets to website',
    children: (
      <div>
        <EuiText size="s">
          <p>
            The Workpad is placed within the HTML of the site by using an HTML placeholder.
            Parameters for the runtime are included inline. See the full list of parameters below.
            You can include more than one workpad on the page.
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <Clipboard
          content={HTML}
          onCopy={() => {
            onCopy('embed');
          }}
        >
          <EuiCodeBlock
            className="canvasWorkpadExport__reportingConfig"
            paddingSize="s"
            fontSize="s"
            language="html"
          >
            {HTML}
          </EuiCodeBlock>
        </Clipboard>
        <EuiSpacer />
        <EuiText>
          <h4>Parameters</h4>
          <p>There are a number of inline parameters to configure the shareable Workpad.</p>
        </EuiText>
        <EuiHorizontalRule />
        <EuiDescriptionList>
          <EuiDescriptionListTitle>
            <EuiCode>kbn-canvas-shareable="canvas"</EuiCode> (required)
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            The type of shareable. In this case, a Canvas Workpad.
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            <EuiCode>kbn-canvas-url</EuiCode> (required)
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            The URL of the Shareable Workpad JSON file.
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            <EuiCode>kbn-canvas-height</EuiCode>
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            The height of the Workpad. Defaults to the Workpad height.
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            <EuiCode>kbn-canvas-width</EuiCode>
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            The width of the Workpad. Defaults to the Workpad width.
          </EuiDescriptionListDescription>
          <EuiDescriptionListTitle>
            <EuiCode>kbn-canvas-page</EuiCode>
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            The page to display. Defaults to the page specified by the Workpad.
          </EuiDescriptionListDescription>
        </EuiDescriptionList>
      </div>
    ),
  },
];

const HTML = `<!-- Include Runtime -->
<script src="kbnCanvas.js"></script>

<!-- Placeholder -->
<div kbn-canvas-shareable="canvas" kbn-canvas-url="workpad.json" />

<!-- Call Runtime -->
<script type="text/javascript">
  KbnCanvas.shareable();
</script>`;

export const ExternalEmbedFlyout = ({ onCopy, onExport, onClose }: Props) => (
  <EuiFlyout onClose={() => onClose('embed')} maxWidth>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id="flyoutTitle">Share on a website</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiText size="s">
        <p>
          Follow these steps to share a static version of this workpad on an external website. It
          will be a visual snapshot of the current workpad, and will not have access to live data.
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiCallOut
        size="s"
        title={
          <div>
            To try sharing, you can{' '}
            <EuiLink
              style={{ textDecoration: 'underline' }}
              onClick={() => {
                onExport('zip');
              }}
            >
              download an example ZIP file
            </EuiLink>{' '}
            containing this workpad, the Canvas Shareable Workpad runtime, and a sample HTML file.
          </div>
        }
        iconType="iInCircle"
      ></EuiCallOut>
      <EuiSpacer />
      <EuiSteps steps={staticEmbedSteps(onExport, onCopy, onClose)} />
    </EuiFlyoutBody>
  </EuiFlyout>
);
