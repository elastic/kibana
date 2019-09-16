/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import { Clipboard } from '../../clipboard';

interface Props {
  /** The URL that will invoke PDF Report generation. */
  pdfURL: string;
  /** Handler to invoke when the PDF is exported */
  onExport: () => void;
  /** Handler to invoke when the URL is copied to the clipboard. */
  onCopy: () => void;
}

/**
 * A panel displayed in the Export Menu with options in which to generate PDF Reports.
 */
export const PDFPanel = ({ pdfURL, onExport, onCopy }: Props) => (
  <div className="canvasWorkpadExport__panelContent">
    <EuiText size="s">
      <p>PDFs can take a minute or two to generate based on the size of your workpad.</p>
    </EuiText>
    <EuiSpacer size="s" />
    <EuiButton fill onClick={onExport} size="s" style={{ width: '100%' }}>
      Generate PDF
    </EuiButton>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <p>
        Alternatively, copy this POST URL to call generation from outside Kibana or from Watcher.
      </p>
    </EuiText>
    <EuiSpacer size="s" />
    <Clipboard content={pdfURL} onCopy={onCopy}>
      <EuiButton
        iconType="copy"
        size="s"
        style={{ width: '100%' }}
        aria-label="Alternatively, you can generate a PDF from a script or with Watcher by using this URL. Press Enter to copy the URL to clipboard."
      >
        Copy POST URL
      </EuiButton>
    </Clipboard>
  </div>
);
