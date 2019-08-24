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
  EuiCodeBlock,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
} from '@elastic/eui';
import { OnCopyFn, OnExportFn, OnCloseFn } from '../workpad_export';
import { Clipboard } from '../../../clipboard';

interface Props {
  onCopy: OnCopyFn;
  onExport: OnExportFn;
  onClose: OnCloseFn;
}

const HTML = `<!-- Include Runtime -->
<script src="kbnCanvas.js"></script>

<!-- Placeholder -->
<div 
  kbn-embed="canvas" 
  kbn-url="workpad.json"
/>

<!-- Call Runtime -->
<script type="text/javascript">
  KbnCanvas.embed();
</script>`;

export const ExternalEmbedFlyout = ({ onCopy, onExport, onClose }: Props) => (
  <EuiFlyout onClose={() => onClose('embed')} className="canvasWorkpadExport__embedFlyout">
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id="flyoutTitle">Embed a Workpad Snaphot</h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="s">
            <p>You can download a snapshot of this Workpad to embed in another website.</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButton
            fill
            onClick={() => {
              onExport('embed');
            }}
            size="s"
            style={{ width: '100%' }}
          >
            Download Snapshot
          </EuiButton>
          <EuiSpacer />
          <EuiText size="s">
            <p>In order to embed the Workpad, you also need to include the Canvas Embed Runtime.</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButton
            fill
            onClick={() => {
              onExport('runtime');
            }}
            size="s"
            style={{ width: '100%' }}
          >
            Download Runtime
          </EuiButton>
          <EuiSpacer />
          <EuiText size="s">
            <p>
              The Workpad is embedded in the HTML of the site by using an HTML placeholder.
              Parameters for the runtime are included inline.
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
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h4>Embed Parameters</h4>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="s">
            There are a number of inline parameters to configure the embedded Workpad.
          </EuiText>
          <EuiHorizontalRule />
          <EuiDescriptionList>
            <EuiDescriptionListTitle>
              <EuiCode>kbn-embed="canvas"</EuiCode> (required)
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              The type of embed. In this case, a Canvas Workpad.
            </EuiDescriptionListDescription>
            <EuiDescriptionListTitle>
              <EuiCode>kbn-url</EuiCode> (required)
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              The URL of the Workpad Snapshot JSON file.
            </EuiDescriptionListDescription>
            <EuiDescriptionListTitle>
              <EuiCode>kbn-height</EuiCode>
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              The height of the Workpad. Defaults to the Workpad height.
            </EuiDescriptionListDescription>
            <EuiDescriptionListTitle>
              <EuiCode>kbn-width</EuiCode>
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              The width of the Workpad. Defaults to the Workpad width.
            </EuiDescriptionListDescription>
            <EuiDescriptionListTitle>
              <EuiCode>kbn-page</EuiCode>
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              The page to display. Defaults to the page specified by the Workpad.
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutBody>
  </EuiFlyout>
);
