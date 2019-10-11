/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiSpacer, EuiCodeBlock, EuiCode } from '@elastic/eui';
import { Clipboard } from '../../clipboard';

const REPORTING_CONFIG = `xpack.reporting:
  enabled: true
  capture.browser.type: chromium`;

interface Props {
  /** Handler to invoke when the Kibana configuration is copied. */
  onCopy: () => void;
}

/**
 * A panel to display within the Export menu when reporting is disabled.
 */
export const DisabledPanel = ({ onCopy }: Props) => (
  <div className="canvasWorkpadExport__panelContent">
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.canvas.workpadHeaderWorkpadExport.pdfPanelDisabledDescription"
          defaultMessage="Export to PDF is disabled. You must configure reporting to use the Chromium browser. Add
          this to your {fileName} file."
          values={{
            fileName: <EuiCode>kibana.yml</EuiCode>,
          }}
        />
      </p>
    </EuiText>
    <EuiSpacer />
    <Clipboard content={REPORTING_CONFIG} onCopy={onCopy}>
      <EuiCodeBlock
        className="canvasWorkpadExport__reportingConfig"
        paddingSize="s"
        fontSize="s"
        language="yml"
      >
        {REPORTING_CONFIG}
      </EuiCodeBlock>
    </Clipboard>
  </div>
);
